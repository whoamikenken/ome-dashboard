// Base response wrapper
export interface OmeHttpStatus {
  statusCode: number
  message: string
}

export interface OmeResponse<T> {
  statusCode: number
  message: string
  response: T
}

// Virtual Host
export interface VHost {
  name: string
  host: Host[]
  origins?: Origins
  signedPolicy?: SignedPolicy
  admissionWebhooks?: AdmissionWebhooks
  originMapStore?: OriginMapStore
}

export interface Host {
  names: string[]
  tls?: Tls
}

export interface Tls {
  certPath: string
  chainCertPath: string
  keyPath: string
}

export interface Origins {
  origin: Origin[]
}

export interface Origin {
  location: string
  pass: Pass
}

export interface Pass {
  schema: string
  urls: Urls
}

export interface Urls {
  url: string[]
}

export interface SignedPolicy {
  enables?: Enables
  policyQueryKeyName?: string
  secretKey?: string
  signatureQueryKeyName?: string
}

export interface AdmissionWebhooks {
  controlServerUrl?: string
  secretKey?: string
  timeout?: number
  enables?: Enables
}

export interface Enables {
  providers: string
  publishers: string
}

export interface OriginMapStore {
  originHostName?: string
  redisServer: RedisServer
}

export interface RedisServer {
  host: string
  auth?: string
}

// Application
export interface Application {
  name: string
  type: string
  providers: Providers
  publishers: Publishers
  outputProfiles?: OutputProfile[]
}

export interface Providers {
  rtmp?: RtmpProvider
  rtspPull?: RtspPullProvider
  rtsp?: object
  ovt?: object
  srt?: SrtProvider
  mpegts?: MpegtsProvider
  webrtc?: WebrtcProvider
  file?: FileProvider
  schedule?: ScheduleProvider
  multiplex?: MultiplexProvider
}

export interface RtmpProvider {
  blockDuplicateStreamName?: boolean
  passthroughOutputProfile?: boolean
}

export interface SrtProvider {
  blockDuplicateStreamName?: boolean
}

export interface MpegtsProvider {
  streams?: StreamMap
}

export interface StreamMap {
  stream: StreamMapStream[]
}

export interface StreamMapStream {
  name: string
  port: string
}

export interface WebrtcProvider {
  timeout?: number
}

export interface FileProvider {
  rootPath?: string
  streamMap?: StreamMap
}

export interface ScheduleProvider {
  mediaRootDir?: string
  scheduleFilesDir?: string
}

export interface MultiplexProvider {
  muxFilesDir?: string
}

export interface RtspPullProvider {
  blockDuplicateStreamName?: boolean
}

export interface Publishers {
  [key: string]: unknown
}

export interface OutputProfile {
  name: string
  outputStreamName: string
  encodes: Encodes[]
}

export interface Encodes {
  [key: string]: unknown
}

// Stream
export interface Stream {
  name: string
  input: StreamInput
  outputs: StreamOutput
}

export interface StreamInput {
  createdTime?: string
  sourceType: string
  sourceUrl?: string
  tracks: Tracks
}

export interface StreamOutput {
  name: string
  tracks: Tracks
  playlists?: Playlists
}

export interface Tracks {
  video?: Track[]
  audio?: Track[]
  data?: Track[]
}

export interface Track {
  id?: number
  name?: string
  codec?: string
  bitrate?: number
  width?: number
  height?: number
  framerate?: number
  sampleRate?: number
  channel?: number
}

export interface Playlists {
  playlist: Playlist[]
}

export interface Playlist {
  name: string
  fileName: string
  options: {
    [key: string]: string
  }
  renditions: Rendition[]
}

export interface Rendition {
  name: string
  video: string
  audio: string
}

// Push Publishing
export interface StreamPush {
  id?: string
  stream: {
    name: string
    tracks?: number[]
    variantNames?: string[]
  }
  protocol: 'srt' | 'rtmp' | 'mpegts'
  url: string
  streamKey?: string
}

export interface StreamPushed extends StreamPush {
  vhost: string
  app: string
  state: 'ready' | 'connecting' | 'pushing' | 'stopping' | 'stopped' | 'error'
  sentBytes?: number
  sentTime?: number
  totalSentBytes?: number
  totalSentTime?: number
  sequence?: number
  startTime?: string
  finishTime?: string
  createdTime?: string
  isConfig?: boolean
}

// Recording
export interface StreamRecord {
  id?: string
  stream: {
    name: string
    variantNames?: string[]
  }
  interval?: number
  filePath?: string
  infoPath?: string
  schedule?: string
  metadata?: string
  segmentationRule?: 'discontinuity' | 'continuity'
}

export interface StreamRecorded extends StreamRecord {
  vhost: string
  app: string
  state: 'ready' | 'started' | 'stopping' | 'stopped' | 'error'
  outputFilePath?: string
  outputInfoPath?: string
  recordBytes?: number
  recordTime?: number
  totalRecordBytes?: number
  totalRecordTime?: number
  sequence?: number
  startTime?: string
  finishTime?: string
  createdTime?: string
  isConfig?: boolean
}

// Statistics
export interface StatsVHost {
  [key: string]: unknown
}

export interface StatsApp {
  [key: string]: unknown
}

export interface StatsStream {
  [key: string]: unknown
}
