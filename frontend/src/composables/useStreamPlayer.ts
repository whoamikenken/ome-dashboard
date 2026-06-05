import { ref, onUnmounted } from 'vue'
import Hls from 'hls.js'
import { config } from '@/composables/useOmeConfig'

export function useStreamPlayer() {
  const isPlaying = ref(false)
  const isFullscreen = ref(false)
  const isPiP = ref(false)
  const isBuffering = ref(false)
  const volume = ref(1) // 0 to 1
  const isMuted = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const error = ref<string | null>(null)
  
  const streamInfo = ref<{
    protocol: string
    url: string
    bitrate: number | null
    resolution: string | null
    codec: string | null
  } | null>(null)

  const videoElement = ref<HTMLVideoElement | null>(null)
  const hlsRef = ref<Hls | null>(null)
  
  let ws: WebSocket | null = null
  let pc: RTCPeerConnection | null = null
  let statsInterval: any = null
  let lastBytesReceived = 0
  let lastTimestamp = 0

  function generateStreamUrl(
    _vhost: string,
    app: string,
    stream: string,
    protocol: 'hls' | 'webrtc' | 'llhls'
  ): string {
    const host = config.value.host || window.location.hostname || 'localhost'
    const useTls = config.value.useTls

    if (protocol === 'webrtc') {
      const port = useTls ? 3334 : 3333
      return `webrtc://${host}:${port}/${app}/${stream}`
    } else if (protocol === 'llhls') {
      const port = useTls ? 8443 : 8080
      const scheme = useTls ? 'https' : 'http'
      return `${scheme}://${host}:${port}/${app}/${stream}/llhls.m3u8`
    } else {
      // hls
      const port = useTls ? 8443 : 8080
      const scheme = useTls ? 'https' : 'http'
      return `${scheme}://${host}:${port}/${app}/${stream}/playlist.m3u8`
    }
  }

  const onFullscreenChange = () => {
    const video = videoElement.value
    if (!video) {
      isFullscreen.value = false
      return
    }
    const target = video.parentElement || video
    isFullscreen.value = document.fullscreenElement === target
  }

  // Set up event listeners on video
  function attachVideoListeners(video: HTMLVideoElement) {
    video.addEventListener('play', () => {
      isPlaying.value = true
    })
    video.addEventListener('pause', () => {
      isPlaying.value = false
    })
    video.addEventListener('volumechange', () => {
      volume.value = video.volume
      isMuted.value = video.muted
    })
    video.addEventListener('timeupdate', () => {
      currentTime.value = video.currentTime
    })
    video.addEventListener('durationchange', () => {
      duration.value = video.duration
    })
    video.addEventListener('waiting', () => {
      isBuffering.value = true
    })
    video.addEventListener('playing', () => {
      isBuffering.value = false
      isPlaying.value = true
    })
    video.addEventListener('seeking', () => {
      isBuffering.value = true
    })
    video.addEventListener('seeked', () => {
      isBuffering.value = false
    })
    video.addEventListener('canplay', () => {
      isBuffering.value = false
    })
    video.addEventListener('enterpictureinpicture', () => {
      isPiP.value = true
    })
    video.addEventListener('leavepictureinpicture', () => {
      isPiP.value = false
    })
    video.addEventListener('resize', () => {
      if (streamInfo.value) {
        streamInfo.value.resolution = `${video.videoWidth}x${video.videoHeight}`
      }
    })
    document.addEventListener('fullscreenchange', onFullscreenChange)
  }

  function detachVideoListeners() {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  }

  async function play(url: string): Promise<void> {
    stop() // reset current state and cleanup previous player

    error.value = null
    isPlaying.value = false
    isBuffering.value = true

    // Detect protocol
    let protocol = 'HLS'
    if (url.includes('llhls.m3u8')) {
      protocol = 'LLHLS'
    } else if (url.startsWith('webrtc://') || url.startsWith('ws://') || url.startsWith('wss://')) {
      protocol = 'WebRTC'
    }

    streamInfo.value = {
      protocol,
      url,
      bitrate: null,
      resolution: null,
      codec: null,
    }

    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.controls = false
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'contain'
    video.volume = volume.value
    video.muted = isMuted.value

    videoElement.value = video
    attachVideoListeners(video)

    if (protocol === 'WebRTC') {
      try {
        await startWebRTC(url, video)
      } catch (err: any) {
        error.value = `WebRTC setup failed: ${err.message || err}`
        isBuffering.value = false
      }
    } else {
      // HLS / LLHLS playback
      if (Hls.isSupported() && (url.endsWith('.m3u8') || url.includes('.m3u8'))) {
        const hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: protocol === 'LLHLS',
        })
        hlsRef.value = hlsInstance
        hlsInstance.loadSource(url)
        hlsInstance.attachMedia(video)

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (data.levels && data.levels.length > 0) {
            const level = data.levels[0]
            if (streamInfo.value) {
              streamInfo.value.resolution = `${level.width}x${level.height}`
              streamInfo.value.codec = level.videoCodec || null
              streamInfo.value.bitrate = level.bitrate
            }
          }
          video.play().catch((e) => {
            error.value = `Autoplay blocked or playback failed: ${e.message}`
          })
        })

        hlsInstance.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          if (streamInfo.value && data.details) {
            // Update codec and resolution from active level details if possible
            const activeLevel = hlsInstance.levels[hlsInstance.currentLevel]
            if (activeLevel) {
              streamInfo.value.resolution = `${activeLevel.width}x${activeLevel.height}`
              streamInfo.value.bitrate = activeLevel.bitrate
            }
          }
        })

        hlsInstance.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                error.value = 'HLS Network error. Retrying...'
                hlsInstance.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                error.value = 'HLS Media error. Attempting recovery...'
                hlsInstance.recoverMediaError()
                break
              default:
                error.value = `Fatal HLS playback error: ${data.details}`
                stop()
                break
            }
          }
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari/iOS)
        video.src = url
        video.addEventListener('loadedmetadata', () => {
          if (streamInfo.value) {
            streamInfo.value.resolution = `${video.videoWidth}x${video.videoHeight}`
          }
          video.play().catch((e) => {
            error.value = `Autoplay blocked or playback failed: ${e.message}`
          })
        })
        video.addEventListener('error', () => {
          error.value = 'Native video element error'
        })
      } else {
        error.value = 'HLS is not supported in this browser'
        isBuffering.value = false
      }
    }
  }

  async function startWebRTC(url: string, video: HTMLVideoElement) {
    let wsUrl = url
    if (url.startsWith('webrtc://')) {
      const isTls = config.value.useTls
      const wsProto = isTls ? 'wss:' : 'ws:'
      wsUrl = url.replace('webrtc://', `${wsProto}//`)
    }

    ws = new WebSocket(wsUrl)
    isBuffering.value = true

    ws.onopen = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            command: 'request_offer',
          })
        )
      }
    }

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.command === 'offer') {
          pc = new RTCPeerConnection({
            iceServers: msg.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
          })

          pc.ontrack = (event) => {
            isBuffering.value = false
            if (event.streams && event.streams[0]) {
              video.srcObject = event.streams[0]
            } else {
              const inboundStream = new MediaStream()
              inboundStream.addTrack(event.track)
              video.srcObject = inboundStream
            }
          }

          pc.onicecandidate = (event) => {
            if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  command: 'candidate',
                  candidate: event.candidate,
                })
              )
            }
          }

          pc.onconnectionstatechange = () => {
            if (pc && pc.connectionState === 'failed') {
              error.value = 'WebRTC PeerConnection failed'
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                command: 'answer',
                sdp: {
                  type: 'answer',
                  sdp: answer.sdp,
                },
              })
            )
          }

          if (streamInfo.value) {
            const sdpText = msg.sdp?.sdp || ''
            const match = sdpText.match(/a=rtpmap:\d+\s+(\w+)\//i)
            if (match) {
              streamInfo.value.codec = match[1].toLowerCase()
            }
          }

          startWebRTCStats(pc)
        } else if (msg.command === 'candidate') {
          if (msg.candidate && pc) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          }
        }
      } catch (err: any) {
        error.value = `WebRTC signaling error: ${err.message || err}`
      }
    }

    ws.onerror = () => {
      error.value = 'WebRTC signaling connection error'
      isBuffering.value = false
    }

    ws.onclose = () => {
      if (pc && pc.connectionState !== 'connected' && !video.srcObject) {
        error.value = 'WebRTC stream not found or connection closed'
        isBuffering.value = false
      }
    }
  }

  function startWebRTCStats(peerConnection: RTCPeerConnection) {
    lastBytesReceived = 0
    lastTimestamp = 0

    statsInterval = setInterval(async () => {
      if (!peerConnection || peerConnection.signalingState === 'closed') {
        clearInterval(statsInterval)
        return
      }

      try {
        const stats = await peerConnection.getStats()
        let bytesReceived = 0
        let timestamp = 0

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            bytesReceived = report.bytesReceived || 0
            timestamp = report.timestamp
          }
        })

        if (lastBytesReceived > 0 && lastTimestamp > 0) {
          const timeDiff = (timestamp - lastTimestamp) / 1000
          if (timeDiff > 0) {
            const bitrateBps = ((bytesReceived - lastBytesReceived) * 8) / timeDiff
            if (streamInfo.value) {
              streamInfo.value.bitrate = Math.round(bitrateBps)
            }
          }
        }

        lastBytesReceived = bytesReceived
        lastTimestamp = timestamp
      } catch (e) {
        // ignore stats fetch errors
      }
    }, 2000)
  }

  function pause() {
    if (videoElement.value) {
      videoElement.value.pause()
    }
  }

  function stop() {
    detachVideoListeners()

    if (statsInterval) {
      clearInterval(statsInterval)
      statsInterval = null
    }

    if (ws) {
      ws.close()
      ws = null
    }

    if (pc) {
      pc.close()
      pc = null
    }

    if (hlsRef.value) {
      hlsRef.value.destroy()
      hlsRef.value = null
    }

    if (videoElement.value) {
      const video = videoElement.value
      video.pause()
      if (video.srcObject) {
        video.srcObject = null
      }
      video.src = ''
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
      videoElement.value = null
    }

    isPlaying.value = false
    isBuffering.value = false
    currentTime.value = 0
    duration.value = 0
    error.value = null
    streamInfo.value = null
  }

  function toggleFullscreen() {
    const video = videoElement.value
    if (!video) return
    const target = video.parentElement || video

    if (!document.fullscreenElement) {
      target.requestFullscreen().catch((err) => {
        error.value = `Fullscreen request failed: ${err.message}`
      })
    } else {
      document.exitFullscreen()
    }
  }

  function togglePiP() {
    const video = videoElement.value
    if (!video) return

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture()
    } else {
      if ('pictureInPictureEnabled' in document && (document as any).pictureInPictureEnabled === false) {
        error.value = 'Picture-in-Picture not supported in this browser'
      } else {
        video.requestPictureInPicture().catch((err) => {
          error.value = `Picture-in-Picture failed: ${err.message}`
        })
      }
    }
  }

  function setVolume(v: number) {
    const capped = Math.max(0, Math.min(1, v))
    volume.value = capped
    if (videoElement.value) {
      videoElement.value.volume = capped
      if (capped > 0) {
        videoElement.value.muted = false
        isMuted.value = false
      }
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (videoElement.value) {
      videoElement.value.muted = isMuted.value
    }
  }

  function seek(time: number) {
    if (videoElement.value) {
      videoElement.value.currentTime = time
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isPlaying,
    isFullscreen,
    isPiP,
    isBuffering,
    volume,
    isMuted,
    currentTime,
    duration,
    error,
    streamInfo,
    videoElement,
    play,
    pause,
    stop,
    toggleFullscreen,
    togglePiP,
    setVolume,
    toggleMute,
    seek,
    generateStreamUrl,
  }
}
