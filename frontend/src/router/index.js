import { createRouter, createWebHistory } from 'vue-router'

// Define routes - simplified for the new architecture
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router