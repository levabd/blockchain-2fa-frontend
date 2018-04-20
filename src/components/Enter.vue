<template>

  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12 mb-2">
          <v-toolbar dark color="primary">
            <v-toolbar-title>
              Сайт клиента - Казахтелеком
            </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-card-text>
            Дальнейшее действие требует авторизации с помощью сервиса 2FA
            <v-btn @click="enter" v-if="!waitingCode">Авторизоваться используя сервис 2FA</v-btn>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
  import axios from 'axios'
  export default {
    created () {
      let vm = this
      axios.get(`/get-config`).then(r => {
        vm.ENV = r.data
      }).catch(r => {
        const config = {
          API_URL: 'http://localhost:3000/v1/api'
        }
        vm.ENV = config
        console.info('error getting env variables')
      })
    },
    methods: {
      serialize (obj) {
        let str = []
        for (let p in obj) {
          if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
          }
        }
        return str.join('&')
      },
      enter () {
        let params = {
          event: 'login',
          lang: 'ru',
          service: 'kaztel',
          client_timestamp: 15242452
        }
        console.log(`${this.ENV.API_URL}/web/enter?${this.serialize(params)}`)
        window.location.href = `${this.ENV.API_URL}/web/enter?${this.serialize(params)}`
      }
    }
  }
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
  pre {
    outline: 1px solid #ccc !important;
    padding: 5px;
    margin: 5px;
  }

  .string {
    color: green !important;
  }

  .number {
    color: darkorange !important;
  }

  .boolean {
    color: blue !important;
  }

  .null {
    color: magenta !important;
  }

  .key {
    color: red !important;
  }
</style>
<style scoped>


  h1, h2 {
    font-weight: normal;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }
</style>
