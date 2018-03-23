<template>

  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12 mb-2">

          <v-toolbar dark color="primary">
            <v-toolbar-title>
              Cервис 2FA
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn v-if="waitingCode || waitingPush || user" @click="clear">Сначала</v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form v-model="valid" ref="form" lazy-validation @submit="submitPhone">
              <v-text-field prepend-icon="phone"
                            label="Номер телефона"
                            v-model="phone"
                            :rules="phoneRules"
                            required
                            v-bind:disabled="waitingCode || waitingPush"
              ></v-text-field>
            </v-form>
            <v-form v-model="codeValid"
                    ref="codeForm"
                    lazy-validation
                    @submit="verify"
                    v-if="waitingCode">
              <v-text-field prepend-icon="phonelink"
                            label="Код из 6 цифр"
                            hint="Введите код который пришел на ваш номер телефона"
                            v-model="code"
                            :rules="codeRules"
                            required
                            v-bind:disabled="!waitingCode"
              ></v-text-field>
            </v-form>
          </v-card-text>

          <v-card-text v-if="waitingPush">
            <v-card color="blue lighten-5 darken-2" class="white--text">
              <v-card-title primary-title>
                <div class="headline">Подтвердите вход</div>
                <div>Подтвердите запрос авторизации на вашем мобильном телефоне</div>
              </v-card-title>
              <v-card-actions>
                <v-btn block @click="back">Выбрать другой способ</v-btn>
              </v-card-actions>
            </v-card>
          </v-card-text>

          <v-card-actions v-if="!waitingCode && !waitingPush">
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="submitPhone" :disabled="!valid" v-if="!waitingCode">
              Продолжить
            </v-btn>
            <v-btn @click="clear" v-if="!waitingCode">очистить</v-btn>
          </v-card-actions>

          <v-card-actions v-if="waitingCode && !waitingPush">
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="verify" :disabled="!codeValid">
              Проверить
            </v-btn>
            <v-btn @click="sendCode('sms', true)">отправить ещё раз</v-btn>
            <v-btn @click="clear" v-if="!waitingCode">заново</v-btn>
          </v-card-actions>

        </v-card>

        <v-card class="elevation-12 mb-2" v-if="hasServerError" transition="fade-transition">
          <v-toolbar dark color="red darken-2">
            <v-toolbar-title>Ошибки</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn red @click="clearErrors">закрыть</v-btn>
          </v-toolbar>
          <v-card-text>
            <v-alert outline color="error"
                     icon="warning"
                     :value="true"
                     v-for="(value, key, index) in serverErrors"
                     :key="key">
              <p class="mb-0 pb-0" v-for="e in value">{{e}}</p>
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="elevation-12 mb-2" v-if="user" transition="fade-transition">
          <v-toolbar color="blue lighten-4">
            <v-toolbar-title>Возвращаемый пользователь</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn red @click="user=null">закрыть</v-btn>
          </v-toolbar>
          <v-card-text>
            <pre v-html="coloredUser">
            </pre>
          </v-card-text>
        </v-card>
        <div>
        </div>
      </v-flex>
    </v-layout>
    <v-bottom-sheet v-model="sheet">
      <v-list>
        <v-subheader>Выберите способ двухфакторной авторизации</v-subheader>
        <v-list-tile
          v-for="tile in tiles"
          :key="tile.title"
          @click="sendCode(tile.key, false)"
          v-bind:disabled="tile.key==='push' && !pushToken || tile.key==='telegram' || tile.key==='whatsapp'"
        >
          <v-list-tile-avatar>
            <v-avatar size="32px" tile>
              <img :src="`static/img/${tile.img}`" :alt="tile.title">
            </v-avatar>
          </v-list-tile-avatar>
          <v-list-tile-title>{{ tile.title }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-bottom-sheet>
  </v-container>
</template>

<script>
  import axios from 'axios'

  export default {
    mounted () {
      console.log('this.$root.$data', this.$root.$data)
    },
    data () {
      let vm = this
      return {
        valid: true,
        phone: '',
        user: null,
        hasServerError: false,
        serverErrors: false,
        waitingCode: false,
        waitingPush: false,
        phoneRules: [
          v => !!v || 'Заполните номер телефона',
          v => /^[+]?[0-9]{10,14}$/.test(v) || 'Формат номера телефона неверен'
        ],
        code: null,
        codeValid: true,
        codeRules: [
          v => !!v || 'Введите код',
          v => (!!v && vm.isNumeric(v)) || 'Только цифры',
          v => `${v}`.length === 6 || 'Введите 6 цифр'
        ],
        sheet: false,
        tiles: [
          {img: 'push.png', title: 'Мобильное приложение', key: 'push'},
          {img: 'sms.png', title: 'SMS', key: 'sms'},
          {img: 'telegram.png', title: 'Telegram', key: 'telegram'},
          {img: 'whatsapp.png', title: 'whatsapp', key: 'whatsapp'}
        ],
        pushToken: null
      }
    },
    computed: {
      coloredUser () {
        return this.syntaxHighlight(JSON.stringify(this.user, undefined, 4))
      }
    },
    methods: {
      isNumeric (n) {
        return !isNaN(parseFloat(n)) && isFinite(n)
      },
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
          var cls = 'number'
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
      },
      reduceLetter (event) {
        console.log('data', event)
      },
      async verify () {
        let vm = this
        if (!this.$refs.codeForm.validate()) {
          return
        }
        let verifyResponse
        try {
          verifyResponse = await axios.post(`${this.$root.ENV.API_URL}/verification/verify`, {
            phone_number: this.phone,
            service: 'kaztel',
            code: parseInt(this.code, 10),
            client_timestamp: (new Date()).getTime() / 1000,
            event: 'login',
            lang: 'ru'
          }).then(r => {
            return r.data
          }).catch(r => {
            this.handleError(r)
            throw new Error(r)
          })
        } catch (e) {
          this.handleError(e)
          console.error(e)
          return
        }

        if (!verifyResponse && verifyResponse.status !== 'success') {
          console.error('error', verifyResponse)
          return
        }
        this.clearErrors()
        if (!verifyResponse.link) {
          console.error('Cant check batch status - no link provided')
          return
        }
        const id = verifyResponse.link.replace(`${this.$root.ENV.VALIDATOR_API_URL}/batch_statuses?id=`, '')
        if (!id) {
          return
        }

        if (!verifyResponse.logIndexToCheck) {
          console.error('Cant check batch status - no verifyResponse.logIndexToCheck')
          return
        }

        this.batchChecker(id, () => {
          try {
            axios.post(`${this.$root.ENV.API_URL}/verification/check-verification`, {
              phone_number: this.phone,
              service: 'kaztel',
              index: verifyResponse.logIndexToCheck,
              lang: 'ru'
            }).then(r => {
              console.log('r', r)
              const status = r.data.status || null
              if (status === 'INVALID') {
                vm.hasServerError = true
                vm.serverErrors = []
                vm.code = ''
                vm.serverErrors.push({user: 'Вы ввели некорректный код'})
              }
              if (status === 'VALID') {
                this.user = r.data.user

                this.waitingPush = false
                this.waitingCode = false
                this.clear()
              }
              if (status === 'PENDING') {
                console.error('Status PENDING')
              }
              if (status === 'EXPIRED') {
                vm.hasServerError = true
                vm.serverErrors = []
                vm.serverErrors.push({user: 'Срок действия кода истекло. Отправьте код повторно.'})
              }
            }).catch(this.handleError)
          } catch (e) {
            clearInterval(vm.codechekerInterval)
          }
        }, error => {
          console.log('error', error)
          if (error.invalid_transactions.length) {
            error.invalid_transactions.forEach(function (transaction) {
              console.log('transaction', transaction)
            })
          }
        })
      },
      batchChecker (id = '', cb_success = () => {
      }, cb_error = () => {
      }) {
        let counter = 0
        let vm = this
        vm.codechekerInterval = setInterval(function () {
          axios.get(`${this.$root.ENV.API_URL}/chain/batch_statuses`, {params: {id: id}})
            .then(rs => {
              const status = rs.data.status || null
              if (status === 'INVALID') {
                console.error('Status INVALID')
                clearInterval(vm.codechekerInterval)
                cb_error(rs.data)
                return
              }
              if (status === 'COMMITTED') {
                console.error('Status COMMITTED')
                cb_success(rs.data)
                clearInterval(vm.codechekerInterval)
              }
              if (status === 'PENDING') {
                console.error('Status PENDING')
                clearInterval(vm.codechekerInterval)
              }
            })
            .catch(r => {
              clearInterval(vm.codechekerInterval)
              vm.handleError(r)
            })
          if (counter >= 10) {
            clearInterval(vm.codechekerInterval)
          }
          counter++
        }, 500)
      },
      sendCode (method, resend = false) {
        this.sheet = false
        let vm = this
        axios.post(`${this.$root.ENV.API_URL}/verification/code`, {
          phone_number: this.phone,
          service: 'kaztel',
          method: method,
          client_timestamp: (new Date()).getTime() / 1000,
          event: 'login',
          resend: resend,
          lang: 'ru'
        }).then(r => {
          if (r.data && r.data.status === 'success') {
            this.clearErrors()
            if (!r.data.link) {
              console.log('Cant check batch status - no link')
              return
            }
            const id = r.data.link.replace('http://127.0.0.1:8008/batch_statuses?id=', '')
            if (!id) {
              return
            }
            console.log('r', r)
            let counter = 0
            vm.codechekerInterval = setInterval(function () {
              axios.get(`${this.$root.ENV.API_URL}/chain/batch_statuses`, {params: {id: id}})
                .then(rs => {
                  console.log('rs', rs)

                  if (rs.data && rs.data.status && rs.data.status === 'COMMITTED') {
                    axios.get(`${this.$root.ENV.API_URL}/verification/deliver/${'kaztel'}/${method}/${vm.phone}`)
                      .then(_rs => {
                        const status = _rs.data['status']
                        console.log('_rs', status)
                        if (status === 'COMMITTED') {
                          console.error('Status PENDING')
                          return
                        }
                        if (status === 'success') {
                          vm.afterSend(method)
                        }
                        if (status === 'PENDING') {
                          console.error('Status PENDING')
                        }
                      })
                      .catch((r) => {
                        clearInterval(vm.codechekerInterval)
                        vm.handleError(r)
                      })
                    clearInterval(vm.codechekerInterval)
                  }
                  if (status === 'PENDING') {
                    console.error('Status PENDING')
                  }

                  if (status === 'INVALID') {
                    console.error('Status INVALID')
                  }
                })
                .catch(() => {
                  clearInterval(vm.codechekerInterval)
                })
              if (counter >= 10) {
                clearInterval(vm.codechekerInterval)
              }
              counter++
            }, 500)
          } else {
            console.log('error', r)
          }
        }).catch(this.handleError)
      },
      afterSend (method) {
        switch (method) {
          case 'push':
            this.waitingPush = true
            break
          case 'sms':
            this.waitingCode = true
            break
          case 'telegram':
            break
          case 'whatsapp':
            break
          default:
            console.error('methodd is not supported')
            break
        }
      },
      submitPhone () {
        console.log('this.$root.ENV', this.$root.$data)
        if (this.$refs.form.validate()) {
          // Native form submission is not yet supported
          axios.post(`${this.$root.ENV.API_URL}/verification/verify-user`, {
            phone_number: this.phone,
            service: 'kaztel',
            client_timestamp: (new Date()).getTime() / 1000,
            event: 'login',
            lang: 'ru'
          }).then(r => {
            if (r.data && r.data.status === 'success') {
              this.clearErrors()
              // this.$router.push({ path: `/send/${this.phone_number}` })
              this.sheet = true
              this.pushToken = r.data.push_token
            } else {
              console.log('error', r)
            }
          }).catch(this.handleError)
        }
      },
      handleError (error) {
        console.log('error.response', error)

        if (error.response.status === 422) {
          this.hasServerError = true
          this.serverErrors = error.response.data
        }
        if (error.response.status === 502) {
          this.hasServerError = true
          this.serverErrors = error.response.data
        }
        if (error.response.status === 404) {
          this.hasServerError = true
          this.serverErrors = []
          this.serverErrors.push({user: 'Пользователь не найден'})
        }
      },
      clear () {
        this.$refs.form.reset()
        this.hasServerError = false
        this.code = ''
        this.waitingPush = false
        this.waitingCode = false
        this.serverErrors = []
      },
      back () {
        this.hasServerError = false
        this.waitingPush = false
        this.waitingCode = false
        this.serverErrors = []
      },
      clearErrors () {
        this.hasServerError = false
        this.serverErrors = []
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
