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

  container.appendChild(dom);

  return { dom };
}
/**
 * 1. requestIdle을 쓰긴하지만, 브라우저가 계속 쉬지 않고 일을 한다면 계속 블럭되면 안된다.
 * 2. 최소 기다리는 시간(데드라인)이 있어야한다.
 * 3. requestIdleCallback -> task queue, micro task
 * 4. deadline -> 시간
 */

// 부모가 무조건 먼저 렌더링 되어야한다
// DFS
let nextUnitOfWork: fiver = null;
// { dom, children }

// 1 순위. child[0]
// 2 순위. 내 sibling
// 3 순위. parent Sibling
// return {
//   type: "TEXT_ELEMENT",
//   props: {
//     nodeValue: text,
//     children: [],
//   },
//   dom : Element
//   parentFiber: Fiber (parentDom + parentSibling을 얻기 위해서)
//   childINdex
// };
// 1. performUnitOfWork 실행.
// 2. render 1개만
// 3. nextUnitOfWork를 생성해야한다.
function performUnitOfWork(nextUnitOfWork) {
  const dom = render(nextUnitOfWork); // parentdom.appendchild(dom)
  nextUnitOfWork.dom = dom;

  // A -> B(C) -> E(C) => F(K)
  //                   => K(G)
  //           -> G(C)
  //   -> C(D)
  //   -> D()

  // A -> B( ,0) -> E(C,0) => F(G,0)
  //                       => K(G,1)
  //             -> G(C,1)
  //   -> C( ,1)
  //   -> D( ,2)

  // 1) child[0]
  let nextFiber = null;

  if (children.length > 1) {
    nextFiber = createFiber(element.props.children[0]);
  } else if (children[index + 1]) {
    // 2) next sibling
    nextFiber = createFiber(nextUnitOfWork.chidren[index + 1]);
  } else if (nextUnitOfWork.parentFiber.nextSibling) {
    // 3) parent sibling
    nextFiber = createFiber(nextUnitOfWork.parentFiber.nextSibling);
  }

  nextFiber && (nextFiber.parent = nextUnitOfWork);

  return nextFiber;
}
// TODO : 01/31 , createFiber, nextSibling 할당하기

function workLoop(deadline) {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

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
