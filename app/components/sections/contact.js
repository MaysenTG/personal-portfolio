import Component from '@glimmer/component'
import { action } from '@ember/object'
import { tracked } from '@glimmer/tracking'
import ENV from 'ember-portfolio/config/environment'

export default class ContactComponent extends Component {
  @tracked sending = false
  @tracked sent = false
  @tracked submitError = false
  @tracked email = ''
  @tracked name = ''
  @tracked message = ''

  get isFormValid() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(this.email.trim()) && this.name.trim() && this.message.trim()
  }

  get cannotSubmit() {
    return !this.isFormValid || this.sending
  }

  @action
  async submitForm(event) {
    event.preventDefault()
    if (this.cannotSubmit) return

    this.sending = true
    this.submitError = false

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.emailBody()),
      })

      if (!response.ok) {
        throw new Error(`EmailJS responded with ${response.status}`)
      }

      this.sent = true
      this.email = ''
      this.name = ''
      this.message = ''
    } catch (error) {
      console.error(error)
      this.submitError = true
    } finally {
      this.sending = false
    }
  }

  emailBody() {
    const { service_id, template_id, user_id } = ENV.EMAIL_JS

    return {
      service_id,
      template_id,
      user_id,
      template_params: {
        name: this.name,
        email: this.email,
        message: this.message,
      },
    }
  }
}
