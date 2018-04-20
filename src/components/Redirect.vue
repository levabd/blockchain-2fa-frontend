<template>

  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12 mb-2" v-if="user" transition="fade-transition">
          <v-toolbar color="blue lighten-4">
            <v-toolbar-title>Возвращаемый пользователь</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-card-text>
            <pre v-html="coloredUser">
            </pre>
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
        console.log('get this.ENV ', vm.ENV)
      }).catch(r => {
        console.info('error getting env variables')
      })
    },
    data () {
      return {
        user: null
      }
    },
    computed: {
      coloredUser () {
        return this.syntaxHighlight(JSON.stringify(this.user, undefined, 4))
      }
    },
    methods: {
      syntaxHighlight (json) {
        if (!json) {
          return
        }
        if (typeof json !== 'string') {
          json = JSON.stringify(json, undefined, 2)
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // eslint-disable-next-line
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
          let cls = 'number'
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key'
            } else {
              cls = 'string'
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean'
          } else if (/null/.test(match)) {
            cls = 'null'
          }
          return '<span class="' + cls + '">' + match + '</span>'
        })
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
