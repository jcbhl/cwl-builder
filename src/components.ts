class HelloWorld extends HTMLElement {
  constructor() {
    super();
    console.log("constructed");
  }

  connectedCallback() {
    this.textContent = "asdfasdfasdf";
    console.log("new component attached");
  }
}

export function setupComponents() {
  customElements.define("hello-world", HelloWorld);
}
