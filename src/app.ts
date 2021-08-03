interface Validate {
  value: string | number;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  max?: number;
  min?: number;
}

interface Draggable {
  dragStart(event: DragEvent): void;
  dragEnd(event: DragEvent): void;
}

interface DragTarget {
  dragOver(event: DragEvent): void;
  dragLeave(event: DragEvent): void;
  drop(event: DragEvent): void;
}

// type subscriberFn<T> = (items: T[]) => void;

enum ProjectStatus { Active, Finished };

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public numberOfPeople: number,
    public projectStatus: ProjectStatus) { }
}

// Emitter
class Emitter<_> {
  listeners: { [key: string]: Function[] } = {};

  subscribe = (event: string, callbackFn: Function): Function => {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callbackFn);

    return () => {
      this.listeners[event].filter((fn: Function) => fn !== callbackFn);
    }
  }

  emit(event: string, value?: any) {
    if (!Array.isArray(this.listeners[event])) {
      console.warn('There is no such event :(');
    }
    this.listeners[event].forEach((fn: Function) => fn(value));
  }
}

class ProjectEmitter extends Emitter<Project> {
  private projects: Project[] = [];

  addProject = (project: Project): void => {
    this.projects.push(project);
  }

  moveProject = (projectId: string, newStatus: ProjectStatus) => {
    const project = this.projects.find(prj => prj.id === projectId);

    if (project) {
      project.projectStatus = newStatus;
    }
  }


  get projectsList() {
    return this.projects;
  }
}
const emitter = new ProjectEmitter();

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement
  hostElement: T;
  element: U;

  constructor(templateElementId: string, hostElementId: string, public position: InsertPosition, elementId?: string) {
    this.templateElement = document.querySelector(templateElementId)!;
    this.hostElement = document.querySelector(hostElementId)!;

    const importedNode = document.importNode(this.templateElement.content, true);
    this.element = importedNode.firstElementChild as U;

    if (elementId) {
      this.element.id = elementId;
    }

  }

  attach() {
    this.hostElement.insertAdjacentElement(this.position, this.element);
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

// ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{
  titleInputElement: HTMLInputElement;
  descriptionElement: HTMLTextAreaElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super('#project-input', '#app', 'afterbegin', 'user-input');

    this.titleInputElement = this.element.querySelector('#title')!;
    this.descriptionElement = this.element.querySelector('#description')!;
    this.peopleInputElement = this.element.querySelector('#people')!;

    this.attach();
    this.configure();
  }

  renderContent() { };


  private clear = (): void => {
    this.titleInputElement.value = '';
    this.descriptionElement.value = '';
    this.peopleInputElement.value = '';
  }

  private checkValidity = (validatableObject: Validate): boolean => {
    let isValid = true;

    if (validatableObject.required) {
      isValid = isValid && validatableObject.value.toString().trim().length !== 0;
    }

    if (validatableObject.minLength) {
      isValid = isValid && validatableObject.value.toString().length >= validatableObject.minLength;
    }

    if (validatableObject.maxLength) {
      isValid = isValid && validatableObject.value.toString().length <= validatableObject.maxLength;
    }

    if (validatableObject.min && typeof validatableObject.value === 'number') {
      isValid = isValid && validatableObject.value >= validatableObject.min;
    }
    if (validatableObject.max && typeof validatableObject.value === 'number') {
      isValid = isValid && validatableObject.value <= validatableObject.max;
    }

    return isValid;
  }

  private getUserInputs = (): [string, string, number] | void => {
    const titleInput = this.titleInputElement.value;
    const descElement = this.descriptionElement.value;
    const peopleInputElement = this.peopleInputElement.value;

    const validateTitle: Validate = {
      required: true,
      value: titleInput,
      minLength: 2,
      maxLength: 10
    }
    const validateDescription: Validate = {
      required: true,
      value: descElement,
      minLength: 2,
      maxLength: 10
    }
    const validatePeople: Validate = {
      required: true,
      value: peopleInputElement,
      min: 1,
      max: 7
    }

    if (!this.checkValidity(validateTitle) || !this.checkValidity(validateDescription) || !this.checkValidity(validatePeople)) {
      console.log('Error! Please fill out all fields accordingly');
      return;
    }
    return [titleInput, descElement, +peopleInputElement];
  }

  submitHandler = (event: Event) => {
    event.preventDefault();

    const userInputs = this.getUserInputs();

    if (Array.isArray(userInputs)) {
      const [title, description, numberOfPeople] = userInputs;
      const project = new Project(Math.random().toString(),
        title, description,
        numberOfPeople,
        ProjectStatus.Active
      )
      emitter.addProject(project);
      emitter.emit('project:submit');
      this.clear();
    }
  }

  configure() {
    this.element.addEventListener('submit', this.submitHandler)
  }
}


// ProjectList class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
  assignedProjects: Project[] = [];

  constructor(private state: 'active' | 'finished') {
    super('#project-list', '#app', 'beforeend', `${state}-projects`)
    this.attach();
    this.renderContent();
    this.configure();
  }

  dragOver = (event: DragEvent) => {
    if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
      event.preventDefault();
      this.element.querySelector('ul')?.classList.add('droppable');
    }
  }

  dragLeave = (event: DragEvent) => {
    this.element.querySelector('ul')?.classList.remove('droppable');
  }

  drop = (event: DragEvent) => {
    const id: string = event.dataTransfer!.getData('text/plain');
    emitter.moveProject(id, this.state === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);
    emitter.emit('project:submit');
  }

  configure = () => {
    this.element.addEventListener('dragover', this.dragOver);
    this.element.addEventListener('dragleave', this.dragLeave);
    this.element.addEventListener('drop', this.drop);

    emitter.subscribe('project:submit', () => {
      this.assignedProjects = emitter.projectsList.filter(project => {
        if (this.state === 'active') {
          return project.projectStatus === ProjectStatus.Active;
        } else {
          return project.projectStatus === ProjectStatus.Finished;
        }
      })
      this.renderProjects();
    });
  }

  renderContent = () => {
    const listId = `${this.state}-projects-list`;
    this.element.querySelector('ul')!.id = listId;
    this.element.querySelector('h2')!.textContent = `${this.state.toUpperCase()} PROJECTS`
  }

  private renderProjects = () => {
    let projectList = document.querySelector(`#${this.state}-projects-list`)!;
    projectList.innerHTML = '';

    for (let project of this.assignedProjects) {
      new ProjectItem(this.element.querySelector('ul')!.id, project);
    }
  }

// ProjectItem class 
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
  private project: Project;
  constructor(hostId: string, project: Project) {
    super('#single-project', `#${hostId}`, 'beforeend', project.id);
    this.project = project;

    this.configure()
    this.renderContent();
    this.attach();
  }

  get persons() {
    if (this.project.numberOfPeople === 1) {
      return `1 person assigned`;
    } else {
      return `${this.project.numberOfPeople} persons assigned`;
    }
  }

  dragStart = (event: DragEvent): void => {
    event.dataTransfer!.setData('text/plain', this.element.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  dragEnd = (_: DragEvent): void => {
    console.log('END');

  }
  configure = () => {
    this.element.addEventListener('dragstart', this.dragStart)
    this.element.addEventListener('dragend', this.dragEnd);
  }

  renderContent = () => {
    this.element.querySelector('h2')!.textContent = this.project.title;
    this.element.querySelector('h3')!.textContent = this.persons;
    this.element.querySelector('span')!.textContent = this.project.description;
  }
}


const prjInput = new ProjectInput();
const activePrjtList = new ProjectList('active');
const finishedPrjtList = new ProjectList('finished');