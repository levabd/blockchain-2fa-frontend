import Vue from 'vue'
import Router from 'vue-router'
import Entrance from '@/components/Entrance'
import Enter from '@/components/Enter'
import Redirect from '@/components/Redirect'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Entrace',
      component: Entrance
    },
    {
      path: '/enter',
      name: 'Enter',
      component: Enter
    },
    {
      path: '/redirect_url',
      name: 'Redirect',
      component: Redirect
    }
  ]
})
