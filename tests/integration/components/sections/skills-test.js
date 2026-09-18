import { module, test } from 'qunit'
import { setupRenderingTest } from 'ember-qunit'
import { render } from '@ember/test-helpers'
import { hbs } from 'ember-cli-htmlbars'

module('Integration | component | sections/skills', function (hooks) {
  setupRenderingTest(hooks)

  test('it renders a skills section with tools in use', async function (assert) {
    await render(hbs`<Sections::Skills />`)

    assert.dom('[data-test-skills-section]').exists('renders the skills section')
    assert.dom('[data-test-skills-section]').includesText('My tech stack')
    assert.dom('[data-test-skills-section]').includesText('Ruby on Rails')
    assert.dom('[data-test-skills-section]').includesText('Where it shows up')
  })
})
