import Component from '@glimmer/component'

export default class SkillsComponent extends Component {
  skillGroups = [
    {
      title: 'Frameworks/Languages',
      items: ['Ruby on Rails', 'Ember', 'ASP.NET', 'React'],
    },
    {
      title: 'Services/Infrastructure',
      items: ['PostgreSQL', 'Stripe', 'Cloudflare'],
    },
    {
      title: 'Other',
      items: ['Optimizing database queries', 'Mentoring junior developers', 'Writing documentation '],
    },
  ]
}
