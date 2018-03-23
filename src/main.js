// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import axios from 'axios'

Vue.use(Vuetify)
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  created () {
    let vm = this
    axios.post(`get-config`).then(r => {
      vm.$set('ENV', r.data)
    }).catch(r => {
      vm.$set('ENV', {
        API_URL: 'http://localhost:3000/v1/api',
        VALIDATOR_API_URL: 'http://sawtooth-validator-public:8008'
      })
      console.info('error getting env variables')
    })
  },
  router,
  components: {App},
  template: '<App/>'
})
