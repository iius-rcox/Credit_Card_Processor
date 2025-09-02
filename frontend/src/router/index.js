import { createRouter, createWebHistory } from 'vue-router'

// Define routes - these can be expanded later
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/core/SessionSetup.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router