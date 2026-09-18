import Component from '@glimmer/component'
import { projects } from 'ember-portfolio/utils/projects'

export default class ProjectsAllComponent extends Component {
  projects = projects
}
