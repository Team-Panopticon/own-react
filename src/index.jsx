// import React from "react";
// import ReactDOM from "react-dom";

// const element = (
//   <div id="foo">
//     <a>bar</a>
//     <b />
//   </div>
// );

// createElement("div", null, a, b)
// {
//     "type": "div",
//     "props": { "children": [a, b] }
// }

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function render(element, container) {
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  const { children, ...props } = element.props;

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));

  children.forEach((child) => render(child, dom));

  container.appendChild(dom);
}

const Didact = {
  createElement,
  render,
};

// const element = Didact.createElement(
//   "div",
//   { id: "foo" },
//   Didact.createElement("a", null, "bar"),
//   Didact.createElement("b")
// );

/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);

const container = document.getElementById("root");

Didact.render(element, container);
