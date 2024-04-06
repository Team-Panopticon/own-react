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
  nextFiber?: Fiber;

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
  const { type, nextFiber } = fiber;

  const dom = (() => {
    switch (type) {
      case "TEXT_ELEMENT":
        return document.createTextNode("");
      case "DOCUMENT_FRAGMENT":
        return document.createDocumentFragment();
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

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  console.log("==== perforn unit of work", nextUnitOfWork);
  const dom = createDOM(nextUnitOfWork); // parentdom.appendchild(dom)

  if (nextUnitOfWork.props.id === "bar") {
    // @ts-ignore
    window.temp = nextUnitOfWork;
  }

  nextUnitOfWork.dom = dom;
  nextUnitOfWork.container.appendChild(dom);

  const {
    nextFiber,
    props: { children },
  } = nextUnitOfWork;

  children.forEach((child, i) => {
    if (i === children.length - 1) {
      // child.alternate = nextUnitOfWork.alternate.props.child[i];
      child.nextFiber = nextFiber;
    } else {
      child.nextFiber = children[i + 1];
    }

    child.parent = nextUnitOfWork;

    if (isHTMLElement(nextUnitOfWork)) {
      child.container = nextUnitOfWork.dom;
    }
  });

  const nextWork = nextUnitOfWork.props.children[0] || nextFiber;
  return nextWork;
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
    wipRoot.container.replaceChildren(wipRoot.dom);
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

const updateValue = (e) => {
  rerender(e.target.value);
};

const rerender = (value) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  );

  Didact.render(element, rootEl);
};

rerender("World");
