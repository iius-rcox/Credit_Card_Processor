import { createRouter, createWebHistory } from 'vue-router'

// Define routes – keep App.vue as the layout for consistent chrome
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue')
  },
  {
    path: '/sessions/:id/results',
    name: 'SessionResults',
    // Render App.vue so header/tabs remain consistent; App detects this route
    component: () => import('../App.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
