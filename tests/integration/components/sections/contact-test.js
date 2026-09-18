import { module, test } from 'qunit'
import { setupRenderingTest } from 'ember-portfolio/tests/helpers'
import { render, fillIn, click } from '@ember/test-helpers'
import { hbs } from 'ember-cli-htmlbars'

module('Integration | Component | sections/contact', function (hooks) {
  setupRenderingTest(hooks)

  module('when the form is valid', function (hooks) {
    let originalFetch
    let fetchCalls = []

    hooks.beforeEach(async function () {
      await render(hbs`<Sections::Contact />`)
      await fillIn('[data-test-input="name"]', 'John Doe')
      await fillIn('[data-test-input="email"]', 'john.doe@example.com')
      await fillIn('[data-test-input="message"]', 'Hello, world!')

      fetchCalls = []
      originalFetch = window.fetch
      window.fetch = function (...args) {
        fetchCalls.push(args)
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              text: 'Email sent successfully',
            }),
        })
      }
    })

    hooks.afterEach(function () {
      window.fetch = originalFetch
    })

    test('submit button is enabled', async function (assert) {
      // Note: button is actually type="button" in the template, not "submit"
      assert.dom('[data-test-action="submit-form"]').isEnabled()
    })

    test('submits the form to the emailjs API', async function (assert) {
      await click('[data-test-action="submit-form"]')

      assert.strictEqual(fetchCalls.length, 1, 'fetch called once')
      assert.deepEqual(fetchCalls[0][0], 'https://api.emailjs.com/api/v1.0/email/send', 'correct URL passed to fetch')
      assert.strictEqual(fetchCalls[0][1].method, 'POST', 'method is POST')
      assert.deepEqual(fetchCalls[0][1].headers, { 'Content-Type': 'application/json' }, 'headers are correct')
    })
  })

  module('when the form is invalid', function () {
    test('submit button is disabled', async function (assert) {
      await render(hbs`<Sections::Contact />`)

      assert.dom('[data-test-action="submit-form"]').isDisabled()
    })
  })
})
