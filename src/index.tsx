import { dummy } from "./dummy";

interface Props {
  nodeValue?: string;
  children: Fiber[];
  [key: string]: any;
}

interface Fiber<T = HTMLElement | Text | DocumentFragment> {
  type: string;
  props: Props;
  /** 현재 Fiber의 HTMLElement */
  dom?: T;
  /** parent의 DOM */
  container?: HTMLElement | DocumentFragment;
  sibling?: Fiber;
  /** root는 parent가 없음 */
  parent?: Fiber;
  alternate?: Fiber;
  effectTag?: "PLACEMENT" | "DELETION" | "UPDATE" | null;
}

type FiberWithoutDom = Fiber;

function createElement(type, props, ...children: Fiber[]): FiberWithoutDom {
  const fiber = {
    type,
    props: {
      ...props,
      children,
    },
  };

  fiber.props.children = children.map((child) => {
    if (typeof child === "object") {
      return child;
    } else {
      const textEl = createTextElement(child);
      return textEl;
    }
  });

  return fiber;
}

function createTextElement(text): Fiber {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDOM(fiber: FiberWithoutDom) {
  const { type } = fiber;

  const dom = (() => {
    switch (type) {
      case "TEXT_ELEMENT":
        return document.createTextNode("");
      default:
        return document.createElement(type);
    }
  })();

  const { children, ...props } = fiber.props;

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));

  return dom;
}

/** Root Element를 렌더링하는 함수 */
function render(fiber: FiberWithoutDom, rootElement: HTMLElement) {
  wipRoot = {
    type: "",
    props: {
      children: [fiber],
    },
    dom: rootElement,
    alternate: currentRoot,
  };

  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: Fiber | null = null;
let wipRoot: Fiber | null = null; // 돔에 변경사항이 생겼을때 교정할거
let currentRoot: Fiber | null = null; // currentRoot -> 완성이 되어있어있고 실제돔에도 적용되어 있음.

function isHTMLElement(fiber: Fiber): fiber is Fiber<HTMLElement> {
  return fiber.type !== "TEXT_ELEMENT" ? true : false;
}

function commitRoot() {}

function commitWork() {}

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  console.log("==== perforn unit of work", nextUnitOfWork);

  // wipRoot일 경우 createDom을 해주지 않으려고 (wipRoot.dom에 rootElement가 이미 있어서서
  if (!nextUnitOfWork.dom) {
    nextUnitOfWork.dom = createDOM(nextUnitOfWork);
  }

  /**
   * wipRoot일 때 parent가 없으니까 에러 방지
   * @TODO
   * commit 으로 이동
   */
  if (nextUnitOfWork.parent) {
    nextUnitOfWork.parent.dom.appendChild(nextUnitOfWork.dom);
  }

  const {
    props: { children },
  } = nextUnitOfWork;

  // nextFiber로직을 parent와 sibling으로 해결해야함

  children.forEach((child, i) => {
    child.sibling = children[i + 1];
    child.parent = nextUnitOfWork;

    if (isHTMLElement(nextUnitOfWork)) {
      child.container = nextUnitOfWork.dom;
    }
  });
  /**
   * 1. 내 자식
   * 2. 내 sibling
   * 3. 부모의 sibling
   */

  // 내 자식이 방문된 놈인지 아닌지 알아야함
  // dom이 생성되었는지 여부?

  if (nextUnitOfWork.props.children[0] || nextUnitOfWork.sibling) {
    return nextUnitOfWork.props.children[0] || nextUnitOfWork.sibling;
  }

  // parent를 타고 올라간다.parent의 sibling이 있는 지점에서 멈춘다.
  let nextWork = nextUnitOfWork.parent;

  // 블로그 코드
  // let nextFiber = fiber
  // while (nextFiber) {
  //   if (nextFiber.sibling) {
  //     return nextFiber.sibling
  //   }
  //   nextFiber = nextFiber.parent
  // }

  while (true) {
    if (nextWork.sibling) {
      return nextWork.sibling;
    }

    if (!nextWork.parent) return;
    nextWork = nextWork.parent;
  }
}

function workLoop(deadline) {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // nextUnitOfWork가 없을 경우 가상 DOM에 렌더링 완료
  // commit
  if (!nextUnitOfWork) {
    currentRoot = wipRoot;
    wipRoot = null;
    return;
  }
  requestIdleCallback(workLoop);
}

// @ts-ignore
window.startLoop = () => requestIdleCallback(workLoop);
requestIdleCallback(workLoop);

const Didact = {
  createElement,
  render,
};

/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    depth 1
    <p>
      depth 2 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This is A
      <ab>depth 3 This is AB</ab> depth 2 Th
    </p>
    <c>depth 2 this is C</c>
    <br />
    tt
    <div id="bar">
      depth 1-1
      <p>
        depth 2-1 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This
        is A<ab>depth 3 This is AB</ab> depth 2 Th
      </p>
      <c>depth 2-1 this is C</c>
      <br />
      tt
    </div>
  </div>
);

/** @jsx Didact.createElement */
const rootEl = document.getElementById("root");

Didact.render(element, rootEl);

// const updateValue = (e) => {
//   rerender(e.target.value);
// };

// const rerender = (value) => {
//   const element = (
//     <div>
//       <input onInput={updateValue} value={value} />
//       <h2>Hello {value}</h2>
//     </div>
//   );

//   Didact.render(element, rootEl);
// };

// rerender("World");
