import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/pages/DashboardHome.vue') },
        { path: 'vhosts', name: 'vhosts', component: () => import('@/pages/VHostsPage.vue') },
        { path: 'vhosts/:vhost', name: 'vhost-detail', component: () => import('@/pages/VHostDetailPage.vue') },
        { path: 'vhosts/:vhost/apps/:app', name: 'app-detail', component: () => import('@/pages/AppDetailPage.vue') },
        { path: 'streams', name: 'streams', component: () => import('@/pages/StreamsPage.vue') },
        { path: 'stats', name: 'stats', component: () => import('@/pages/StatsPage.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') },
      ],
    },
  ],
})

export default router
