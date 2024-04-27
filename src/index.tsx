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
  effectTag?: "PLACEMENT" | "DELETION" | "UPDATE";
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

function commitRoot() {
  commitWork(wipRoot.props.children[0]);

  wipRoot.dom.appendChild(wipRoot.props.children[0].dom);
}

function commitWork(currentFiber: Fiber) {
  currentFiber.props.children.forEach((child) => {
    commitWork(child);
  });
  currentFiber.parent.dom.appendChild(currentFiber.dom);
}

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  console.log("==== perforn unit of work", nextUnitOfWork);

  // wipRoot일 경우 createDom을 해주지 않으려고 (wipRoot.dom에 rootElement가 이미 있어서서
  if (!nextUnitOfWork.dom) {
    nextUnitOfWork.dom = createDOM(nextUnitOfWork);
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

  const { alternate } = nextUnitOfWork;

  // Cursor를 sibling기반으로 찾아준다.
  // currentRoot에 effect를 달아준다.
  let currentCursor = alternate?.props.children[0]; // 기준
  let wipChildren = children; // 비교대상 children
  let wipCursor = wipChildren[0]; // 비교대상 커서

  while (currentCursor || wipCursor) {
    if (currentCursor && !wipCursor) {
      currentCursor.effectTag = "DELETION";
      currentCursor = currentCursor.sibling;
      continue;
    }

    if (wipCursor && !currentCursor) {
      wipCursor.effectTag = "PLACEMENT";
      wipCursor = wipCursor.sibling;
      continue;
    }

    if (currentCursor.type === wipCursor.type) {
      // UPDATE
      currentCursor.effectTag = "UPDATE";
      currentCursor.alternate = wipCursor;
    } else {
      let newFiber: Fiber = {
        ...wipCursor,
        sibling: currentCursor.sibling,
        effectTag: "PLACEMENT",
      };

      currentCursor.sibling = newFiber;
      currentCursor.effectTag = "DELETION";
    }

    currentCursor = currentCursor.sibling;
    wipCursor = wipCursor.sibling;
    console.log("============");
  }

  // codesandbox.io/p/sandbox/didact-6-96533?file=%2Fsrc%2Findex.js%3A182%2C1-238%2C2

  // PLACEMENT - 추가 - t
  // DELETION  - 삭제 -
  // UPDATE    - 갱신 - typE 은 같으나 props가 다를경우
  // 0  1  2  3 <- currentRoot
  // 0  1' 2  3 <- wipRoot

  if (nextUnitOfWork.props.children[0] || nextUnitOfWork.sibling) {
    return nextUnitOfWork.props.children[0] || nextUnitOfWork.sibling;
  }

  // parent를 타고 올라간다.parent의 sibling이 있는 지점에서 멈춘다.
  let nextWork = nextUnitOfWork.parent;

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
    commitRoot();
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
