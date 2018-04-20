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
            <v-form v-model="valid"
                    ref="form"
                    lazy-validation
                    @submit.prevent="submitPhone"
                    @enter="submitPhone">
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
                    @submit.prevent="verify"
                    @enter="verify"
                    v-if="waitingCode">
              <v-text-field prepend-icon="phonelink"
                            label="Код авторизации"
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
            <v-btn color="primary" @click="submitPhone" :disabled="!valid" v-if="!waitingCode">Продолжить</v-btn>
            <v-btn @click="clear" v-if="!waitingCode">очистить</v-btn>
          </v-card-actions>

          <v-card-actions v-if="waitingCode && !waitingPush">
            <v-spacer></v-spacer>
            <v-btn @click="verify" color="primary" :disabled="!codeValid">Проверить</v-btn>
            <v-btn @click="sendCode(lastSendMethod, true)">отправить ещё раз</v-btn>
            <v-btn @click="clear" v-if="!waitingCode">заново</v-btn>
          </v-card-actions>
        </v-card>

        <v-card class="elevation-12 mb-2"
                v-if="varificationValid||varificationReject||varificationInvalid||userNotFound||varificationExpired"
                transition="fade-transition">
          <v-alert type="info" dismissible transition="scale-transition" v-model="varificationValid">
            Вы успешно авторизовались на сервисе
          </v-alert>

          <v-alert type="error" dismissible transition="scale-transition" v-model="varificationReject">
            Пользователь с номером <strong>{{phone}}</strong> утверждает, что он сейчас не входит на сервис
          </v-alert>

          <v-alert type="error" dismissible transition="scale-transition" v-model="varificationInvalid">
            Вы не авторизованы - неверный код
          </v-alert>

          <v-alert type="error" dismissible transition="scale-transition" v-model="userNotFound">
            Пользоваель не найден
          </v-alert>

          <v-alert type="error" dismissible transition="scale-transition" v-model="varificationExpired">
            Срок действия кода истекло повторите вход нажав на кнопку <strong>Отправить ещё раз</strong><br>
            или пройдите авторизацию ещё раз нажав на кнопку <strong>Сначала</strong>
          </v-alert>
        </v-card>

        <v-card class="elevation-12 mb-2" v-if="hasServerError" transition="fade-transition">
          <v-alert @click="hasServerError=false"
                   color="error"
                   dismissible
                   class="elevation-12"
                   icon="warning"
                   :value="true"
                   v-for="(value, key, index) in serverErrors"
                   :key="key"
                   v-model="serverErrors[key]">
            <p class="mb-0 pb-0" v-for="e in value">{{e}}</p>
          </v-alert>
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

        <v-card class="elevation-12 mb-2"
                v-if="showTelegramInstruction"
                transition="fade-transition">
          <v-toolbar color="blue lighten-4">
            <v-toolbar-title>
              Подверждение кода c Telegram
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            Чтобы воспользоваться авторизацией с помощью Telegram выполните следующую последовательность действий:<br>
            1. Откройте <b>Telegram</b><br>
            2. Введите в поиске <b>@BlockchainTfaBot</b><br>
            3. Нажмите на кнопку <b>START</b><br>
            3. Нажмите на кнопку <b>Отправить номер</b><br>
            4. Нажмите на кнопку <br>
            <v-btn blue @click="telegramResend">Продолжить</v-btn>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
    <v-bottom-sheet v-model="sheet">
      <v-list>
        <v-subheader>Выберите способ двухфакторной авторизации</v-subheader>
        <v-list-tile
          v-for="tile in tiles"
          :key="tile.title"
          @click="sendCode(tile.key, false)"
          :disabled="tile.key==='push' && !pushToken || tile.key==='whatsapp'"
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
  import * as SparkMD5 from 'spark-md5'
  import * as CRC32 from 'crc-32'
  import * as CryptoJS from 'crypto-js'

  export default {
    created () {
      let vm = this
      axios.get(`/get-config`).then(r => {
        vm.ENV = r.data
      }).catch(r => {
        const config = {
          API_URL: 'https://allatrack-tfa.tk:443/v1/api'
        }
        vm.ENV = config
        console.info('error getting env variables')
      })
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
          v => `${v}`.length <= 6 || 'Цифр должно быть менее 6'
        ],
        sheet: false,
        tiles: [
          {img: 'push.png', title: 'Мобильное приложение', key: 'push'},
          {img: 'sms.png', title: 'SMS', key: 'sms'},
          {img: 'telegram.png', title: 'Telegram', key: 'telegram'},
          {img: 'whatsapp.png', title: 'whatsapp', key: 'whatsapp'}
        ],
        pushToken: null,
        registeredInTelegram: null,
        showTelegramInstruction: false,
        varificationValid: false,
        varificationExpired: false,
        varificationInvalid: false,
        varificationReject: false,
        stopPulling: false,
        userNotFound: false,
        lastSendMethod: false
      }
    },
    computed: {
      coloredUser () {
        return this.syntaxHighlight(JSON.stringify(this.user, undefined, 4))
      }
    },
    methods: {
      async sendCode (method, resend = false) {
        if (method === 'telegram' && !this.registeredInTelegram) {
          this.sheet = false
          this.showTelegramInstruction = true
          return
        } else {
          this.showTelegramInstruction = false
        }
        this.sheet = false
        let vm = this
        const data = {
          phone_number: this.phone,
          service: this.$route.query.service || 'kaztel',
          method: method,
          client_timestamp: (new Date()).getTime() / 1000,
          event: this.$route.query.event || 'login',
          resend: resend,
          lang: 'ru'
        }
        const url = `/web/code`
        const apiKey = await this.getApiKey(url, data, this.phone)
        let self = this
        axios.post(`${this.ENV.API_URL}${url}`, data, {headers: {'api-key': apiKey}}).then(r => {
          vm.afterSend(method)
          vm.lastSendMethod = method
        }).catch(error => {
          vm.lastSendMethod = ''
          if (error.response.status === 422 && error.response.data.status === 'telegram_bot_unregistered') {
            self.showTelegramInstruction = true
          } else {
            self.handleError(error)
          }
        })
      },
      async verify () {
        if (!this.$refs.codeForm.validate()) {
          return
        }
        const data = {
          phone_number: this.phone,
          service: this.$route.query.service || 'kaztel',
          code: parseInt(this.code, 10),
          client_timestamp: (new Date()).getTime() / 1000,
          event: this.$route.query.event || 'login',
          method: this.lastSendMethod,
          lang: 'ru'
        }
        const url = '/web/verify/code'
        const apiKey = await this.getApiKey(url, data, this.phone)
        await axios.post(`${this.ENV.API_URL}${url}`, data, {
          headers: {'api-key': apiKey}
        }).then(r => {
          const status = r.data.status || null
          if (status === 'VALID') {
            this.user = r.data.user
            this.varificationValid = true
            this.hasServerError = true
            this.serverErrors = []
            this.waitingPush = false
            this.waitingCode = false
            this.clearErrors()
            return
          }
          console.log('unknown responce', r.response)
        }).catch((error, r) => {
          switch (error.response.status) {
            case 400:
              // invalid
              this.varificationInvalid = true
              this.code = ''
              break
            case 440:
              // expired
              this.varificationExpired = true
              this.code = ''
              break
            default:
              this.handleError(error)
              break
          }
        })
      },
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
      },
      async afterSend (method) {
        switch (method) {
          case 'push':
            this.waitingPush = true
            this.stopPulling = false
            this.getData(this.poll)
            break
          case 'sms':
            this.waitingCode = true
            break
          case 'telegram':
            this.waitingCode = true
            break
          case 'whatsapp':
            break
          default:
            console.error('method is not supported')
            break
        }
      },
      async rawGet () {
        // return the promise we made
        const data = {phone_number: this.phone}
        const url = `/web/check-push-verification`
        const apiKey = await this.getApiKey(url, data, this.phone)
        axios.post(`${this.ENV.API_URL}${url}`, data, {
          headers: {'api-key': apiKey}
        }).then(r => {
          switch (r.data.status) {
            case 'NOT_VERIFIED_YET':
              break
            case 'NO_USER':
              this.clearErrors()
              this.varificationValid = false
              this.stopPulling = true
              this.waitingPush = false
              this.waitingCode = false
              this.userNotFound = true
              break
            case 'VALID':
              this.clearErrors()
              this.varificationValid = true
              this.stopPulling = true
              this.waitingPush = false
              this.waitingCode = false
              break
            case 'REJECT':
              this.clearErrors()
              this.stopPulling = true
              this.waitingPush = false
              this.waitingCode = false
              this.userNotFound = false
              this.varificationReject = true
              break
            case 'INVALID':
              this.clearErrors()
              this.varificationInvalid = true
              this.stopPulling = true
              this.userNotFound = false
              break
            case 'EXPIRED':
              this.clearErrors()
              this.varificationExpired = true
              this.stopPulling = true
              this.userNotFound = false
              break
            default:
              break
          }
        }).catch(this.handleError)
      },
      getData (fn) {
        if (this.stopPulling) {
          return
        }
        // higher level wrapper
        this.rawGet()
          .then(fn)
          .catch(function (err) {
            console.log(err)
          })
      },
      poll () {
        let vm = this
        // timer function
        // maybe requestIdleCallback?
        setTimeout(function () {
          vm.getData(vm.poll)
        }, 2000)
      },
      async submitPhone () {
        this.code = ''
        if (this.$refs.form.validate()) {
          // Native form submission is not yet supported
          const data = {
            phone_number: this.phone,
            service: 'kaztel',
            client_timestamp: (new Date()).getTime() / 1000,
            event: 'login',
            lang: 'ru'
          }
          const url = `/web/verify/user`
          const apiKey = await this.getApiKey(url, data, this.phone)
          axios.post(`${this.ENV.API_URL}${url}`, data, {
            headers: {'api-key': apiKey}
          }).then(r => {
            try {
              if (r.data && r.data.status === 'success') {
                this.clearErrors()
                // this.$router.push({ path: `/send/${this.phone_number}` })
                this.sheet = true
                this.pushToken = r.data.push_token
                this.registeredInTelegram = r.data.registered_in_telegram
              }
            } catch (e) {
              console.log('error', e)
            }
          }).catch(this.handleError)
        }
      },
      async telegramResend () {
        const userIsValid = await this.userIsValid()
        if (userIsValid) {
          this.sendCode('telegram')
        }
      },
      async userIsValid () {
        if (this.$refs.form.validate()) {
          // Native form submission is not yet supported
          const data = {
            phone_number: this.phone,
            service: this.$route.query.service || 'kaztel',
            client_timestamp: (new Date()).getTime() / 1000,
            event: this.$route.query.event || 'login',
            lang: 'ru'
          }
          const url = `/web/verify-user`
          const apiKey = await this.getApiKey(url, data, this.phone)
          return axios.post(`${this.ENV.API_URL}${url}`, data, {
            headers: {'api-key': apiKey}
          }).then(r => {
            try {
              if (r.data && r.data.status === 'success') {
                this.clearErrors()
                this.pushToken = r.data.push_token
                this.registeredInTelegram = r.data.registered_in_telegram
                return true
              }
            } catch (e) {
              console.log('error', e)
              return false
            }
          }).catch(err => {
            this.handleError(err)
            return false
          })
        }
        return false
      },
      handleError (error) {
        if (!error.response) {
          console.log('error', error)
          return
        }
        this.hasServerError = true
        if (error.response && error.response.status === 422) {
          this.serverErrors = error.response.data
        }
        if (error.response.status === 502) {
          this.serverErrors = error.response.data
        }
        if (error.response.status === 404) {
          this.serverErrors = []
          this.serverErrors.push({user: 'Пользователь не найден'})
        }
        console.log('this.serverErrors', this.serverErrors)
      },
      clear () {
        this.$refs.form.reset()
        this.hasServerError = false
        this.code = ''
        this.user = null
        this.waitingPush = false
        this.waitingCode = false
        this.varificationValid = false
        this.varificationReject = false
        this.varificationExpired = false
        this.varificationInvalid = false
        this.stopPulling = false
        this.serverErrors = []
      },
      back () {
        this.hasServerError = false
        this.waitingPush = false
        this.waitingCode = false
        this.varificationValid = false
        this.serverErrors = []
      },
      clearErrors () {
        this.hasServerError = false
        this.serverErrors = []
        this.pushToken = null
        this.registeredInTelegram = null
        this.showTelegramInstruction = false
        this.varificationValid = false
        this.varificationExpired = false
        this.varificationInvalid = false
        this.varificationReject = false
        this.stopPulling = false
        this.userNotFound = false
        this.lastSendMethod = false
      },
      makeRandomHexString () {
        let text = ''
        let possible = '1234567890abcdef'
        for (let i = 0; i < 17; i++) {
          text += possible.charAt(Math.floor(Math.random() * possible.length))
        }
        return text
      },
      async getApiKey (url, body, phoneNUmber) {
        url = '/v1/api' + url
        let secret = await this.getEstimatedValue()
        let keys = Object.keys(body)
        let strBody = ''
        keys.forEach(function (key) {
          if (strBody !== '') {
            strBody = `${strBody};${key}:${body[key]}`
          } else {
            strBody = `${key}:${body[key]}`
          }
        })
        console.log('strBody', strBody)
        strBody = strBody + ';'
        return SparkMD5.hash(url + '::body::' + this.decimalToHexString(CRC32.str(strBody)) + '::key::' + secret + '::phone_number::' + phoneNUmber).toString(CryptoJS.enc.Hex) + this.makeRandomHexString()
      },
      decimalToHexString (number) {
        if (number < 0) {
          number = 0xFFFFFFFF + number + 1
        }
        return number.toString(16).toLowerCase()
      },
      getEstimatedValue () {
        const arr = [115, 103, 100, 102, 104, 100, 109, 103, 100, 107, 102, 103, 106, 107]
        let res = ''
        arr.forEach(function (el) {
          res = res + String.fromCharCode(el)
        })
        return res
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
