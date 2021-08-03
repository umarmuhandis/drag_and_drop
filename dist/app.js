"use strict";
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus[ProjectStatus["Active"] = 0] = "Active";
    ProjectStatus[ProjectStatus["Finished"] = 1] = "Finished";
})(ProjectStatus || (ProjectStatus = {}));
;
class Project {
    constructor(id, title, description, numberOfPeople, projectStatus) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.numberOfPeople = numberOfPeople;
        this.projectStatus = projectStatus;
    }
}
class Emitter {
    constructor() {
        this.listeners = {};
        this.subscribe = (event, callbackFn) => {
            this.listeners[event] = this.listeners[event] || [];
            this.listeners[event].push(callbackFn);
            return () => {
                this.listeners[event].filter((fn) => fn !== callbackFn);
            };
        };
    }
    emit(event, value) {
        if (!Array.isArray(this.listeners[event])) {
            console.warn('There is no such event :(');
        }
        this.listeners[event].forEach((fn) => fn(value));
    }
}
class ProjectEmitter extends Emitter {
    constructor() {
        super(...arguments);
        this.projects = [];
        this.addProject = (project) => {
            this.projects.push(project);
        };
        this.moveProject = (projectId, newStatus) => {
            const project = this.projects.find(prj => prj.id === projectId);
            if (project) {
                project.projectStatus = newStatus;
            }
        };
    }
    get projectsList() {
        return this.projects;
    }
}
const emitter = new ProjectEmitter();
class Component {
    constructor(templateElementId, hostElementId, position, elementId) {
        this.position = position;
        this.templateElement = document.querySelector(templateElementId);
        this.hostElement = document.querySelector(hostElementId);
        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild;
        if (elementId) {
            this.element.id = elementId;
        }
    }
    attach() {
        this.hostElement.insertAdjacentElement(this.position, this.element);
    }
}
class ProjectInput extends Component {
    constructor() {
        super('#project-input', '#app', 'afterbegin', 'user-input');
        this.clear = () => {
            this.titleInputElement.value = '';
            this.descriptionElement.value = '';
            this.peopleInputElement.value = '';
        };
        this.checkValidity = (validatableObject) => {
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
        };
        this.getUserInputs = () => {
            const titleInput = this.titleInputElement.value;
            const descElement = this.descriptionElement.value;
            const peopleInputElement = this.peopleInputElement.value;
            const validateTitle = {
                required: true,
                value: titleInput,
                minLength: 2,
                maxLength: 10
            };
            const validateDescription = {
                required: true,
                value: descElement,
                minLength: 2,
                maxLength: 10
            };
            const validatePeople = {
                required: true,
                value: peopleInputElement,
                min: 1,
                max: 7
            };
            if (!this.checkValidity(validateTitle) || !this.checkValidity(validateDescription) || !this.checkValidity(validatePeople)) {
                console.log('Error! Please fill out all fields accordingly');
                return;
            }
            return [titleInput, descElement, +peopleInputElement];
        };
        this.submitHandler = (event) => {
            event.preventDefault();
            const userInputs = this.getUserInputs();
            if (Array.isArray(userInputs)) {
                const [title, description, numberOfPeople] = userInputs;
                const project = new Project(Math.random().toString(), title, description, numberOfPeople, ProjectStatus.Active);
                emitter.addProject(project);
                emitter.emit('project:submit');
                this.clear();
            }
        };
        this.titleInputElement = this.element.querySelector('#title');
        this.descriptionElement = this.element.querySelector('#description');
        this.peopleInputElement = this.element.querySelector('#people');
        this.attach();
        this.configure();
    }
    renderContent() { }
    ;
    configure() {
        this.element.addEventListener('submit', this.submitHandler);
    }
}
class ProjectList extends Component {
    constructor(state) {
        super('#project-list', '#app', 'beforeend', `${state}-projects`);
        this.state = state;
        this.assignedProjects = [];
        this.dragOver = (event) => {
            var _a;
            if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
                event.preventDefault();
                (_a = this.element.querySelector('ul')) === null || _a === void 0 ? void 0 : _a.classList.add('droppable');
            }
        };
        this.dragLeave = (event) => {
            var _a;
            (_a = this.element.querySelector('ul')) === null || _a === void 0 ? void 0 : _a.classList.remove('droppable');
        };
        this.drop = (event) => {
            const id = event.dataTransfer.getData('text/plain');
            emitter.moveProject(id, this.state === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);
            emitter.emit('project:submit');
        };
        this.configure = () => {
            this.element.addEventListener('dragover', this.dragOver);
            this.element.addEventListener('dragleave', this.dragLeave);
            this.element.addEventListener('drop', this.drop);
            emitter.subscribe('project:submit', () => {
                this.assignedProjects = emitter.projectsList.filter(project => {
                    if (this.state === 'active') {
                        return project.projectStatus === ProjectStatus.Active;
                    }
                    else {
                        return project.projectStatus === ProjectStatus.Finished;
                    }
                });
                this.renderProjects();
            });
        };
        this.renderContent = () => {
            const listId = `${this.state}-projects-list`;
            this.element.querySelector('ul').id = listId;
            this.element.querySelector('h2').textContent = `${this.state.toUpperCase()} PROJECTS`;
        };
        this.renderProjects = () => {
            let projectList = document.querySelector(`#${this.state}-projects-list`);
            projectList.innerHTML = '';
            for (let project of this.assignedProjects) {
                new ProjectItem(this.element.querySelector('ul').id, project);
            }
        };
        this.attach();
        this.renderContent();
        this.configure();
    }
}
class ProjectItem extends Component {
    constructor(hostId, project) {
        super('#single-project', `#${hostId}`, 'beforeend', project.id);
        this.dragStart = (event) => {
            event.dataTransfer.setData('text/plain', this.element.id);
            event.dataTransfer.effectAllowed = 'move';
        };
        this.dragEnd = (_) => {
            console.log('END');
        };
        this.configure = () => {
            this.element.addEventListener('dragstart', this.dragStart);
            this.element.addEventListener('dragend', this.dragEnd);
        };
        this.renderContent = () => {
            this.element.querySelector('h2').textContent = this.project.title;
            this.element.querySelector('h3').textContent = this.persons;
            this.element.querySelector('span').textContent = this.project.description;
        };
        this.project = project;
        this.configure();
        this.renderContent();
        this.attach();
    }
    get persons() {
        if (this.project.numberOfPeople === 1) {
            return `1 person assigned`;
        }
        else {
            return `${this.project.numberOfPeople} persons assigned`;
        }
    }
}
const prjInput = new ProjectInput();
const activePrjtList = new ProjectList('active');
const finishedPrjtList = new ProjectList('finished');
//# sourceMappingURL=app.js.map