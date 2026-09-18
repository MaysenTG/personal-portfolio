import Component from '@glimmer/component'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'
import { registerDestructor } from '@ember/destroyable'

const SECTION_IDS = ['about', 'projects', 'contact-me']

export default class NavbarComponent extends Component {
  @tracked activeSection = ''

  constructor() {
    super(...arguments)
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.handleScroll()

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(this.onIntersect.bind(this), {
        rootMargin: '-28% 0px -58% 0px',
        threshold: [0, 0.2, 0.45],
      })

      requestAnimationFrame(() => this.observeSections())
    }

    registerDestructor(this, () => {
      window.removeEventListener('scroll', this.handleScroll)
      this.observer?.disconnect()
    })
  }

  observeSections() {
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) this.observer.observe(el)
    })
  }

  onIntersect(entries) {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

    if (visible?.target?.id) {
      this.activeSection = visible.target.id
    }
  }

  handleScroll() {
    const nav = document.querySelector('nav.navbar')
    if (!nav) return

    nav.classList.toggle('navbar--scrolled', window.scrollY > 80)
  }

  get aboutActive() {
    return this.activeSection === 'about' ? 'active' : ''
  }

  get projectsActive() {
    return this.activeSection === 'projects' ? 'active' : ''
  }

  get contactActive() {
    return this.activeSection === 'contact-me' ? 'active' : ''
  }

  @action
  closeNav() {
    const collapse = document.getElementById('navcol-5')
    if (!collapse?.classList.contains('show')) return

    document.querySelector('.navbar-toggler')?.click()
  }
}
