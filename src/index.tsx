import { Fiber, FiberWithoutDom } from "./types";

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
    if (type === "TEXT_ELEMENT") {
      return document.createTextNode("");
    } else if (typeof type === "string") {
      return document.createElement(type);
    }
  })();

  const { children, ...props } = fiber.props;

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));
  Object.keys(props)
    .filter(isEvent)
    .forEach((event) => {
      dom.addEventListener(event.substring(2).toLowerCase(), props[event]);
    });

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
  requestIdleCallback(workLoop);
}

let nextUnitOfWork: Fiber | null = null;
let wipRoot: Fiber | null = null; // 돔에 변경사항이 생겼을때 교정할거
let currentRoot: Fiber | null = null; // currentRoot -> 완성이 되어있어있고 실제돔에도 적용되어 있음.
let deletions: Fiber[] = [];

function commitRoot() {
  /** @TODO 돔이 없는 경우 부모 돔에서 찾아서 삭제시켜줘야함. */
  deletions.forEach((fiber) => {
    fiber.parent.dom.removeChild(fiber.dom);
  });
  commitWork(wipRoot.props.children[0]);
  deletions = [];
  wipRoot.props.children[0].dom &&
    wipRoot.dom.appendChild(wipRoot.props.children[0].dom);
}

function isProps(prop: string) {
  return prop !== "children";
}

function isEvent(prop: string) {
  return prop.startsWith("on");
}

function isNotEvent(prop: string) {
  return !isEvent(prop);
}

function updateDom(fiber: Fiber) {
  const dom = fiber.alternate.dom;
  const newProps = fiber.props;
  const oldProps = fiber.alternate?.props;

  // 1. 오래된 props를 지운다.
  Object.keys(oldProps)
    .filter(isProps)
    .filter(isNotEvent)
    .forEach((key) => {
      dom[key] = "";
    });
  // 2. 새로운 props를 dom 추가한다.
  Object.keys(newProps)
    .filter(isProps)
    .filter(isNotEvent)
    .forEach((key) => {
      dom[key] = newProps[key];
    });
  // 3. eventListener를 이전 이벤트를 제거한다.
  Object.keys(oldProps)
    .filter(isEvent)
    .forEach((event) => {
      dom.removeEventListener(
        event.substring(2).toLowerCase(),
        oldProps[event]
      );
    });
  // 4. eventListener를 추가.
  Object.keys(newProps)
    .filter(isEvent)
    .forEach((event) => {
      dom.addEventListener(event.substring(2).toLowerCase(), newProps[event]);
    });
}

function commitWork(fiber: Fiber) {
  console.log("Commit Work >> ", fiber);
  if (fiber.effectTag === "PLACEMENT") {
    fiber.props.children.forEach((child) => {
      commitWork(child);
    });
    let target = fiber;
    while (!target.parent.dom) {
      target = target.parent;
    }
    fiber.dom && target.parent.dom.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE") {
    fiber.props.children.forEach((child) => {
      commitWork(child);
    });
    updateDom(fiber);
  }
}

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  console.log("Perforn unit of work >> ", nextUnitOfWork);
  if (typeof nextUnitOfWork.type === "function") {
    const result = nextUnitOfWork.type(nextUnitOfWork.props);
    nextUnitOfWork.props.children = [result];
  } else if (!nextUnitOfWork.dom) {
    // wipRoot일 경우 createDom을 해주지 않으려고 (wipRoot.dom에 rootElement가 이미 있어서서)
    nextUnitOfWork.dom = createDOM(nextUnitOfWork);
  }

  const {
    props: { children },
  } = nextUnitOfWork;

  children.forEach((child, i) => {
    child.sibling = children[i + 1];
    child.parent = nextUnitOfWork;
  });

  const { alternate } = nextUnitOfWork;

  // Cursor를 sibling기반으로 찾아준다.
  let currentCursor = alternate?.props.children[0];
  let wipChildren = children; // 비교대상 children
  let wipCursor = wipChildren[0]; // 비교대상 커서

  while (currentCursor || wipCursor) {
    if (currentCursor && !wipCursor) {
      deletions.push(currentCursor);
      currentCursor = currentCursor.sibling;
      continue;
    }

    if (wipCursor && !currentCursor) {
      wipCursor.effectTag = "PLACEMENT";
      wipCursor = wipCursor.sibling;
      continue;
    }

    if (currentCursor.type === wipCursor.type) {
      // props를 돌면서 각 props가 바뀌었는지랑, children이 길이가 바뀌었는지, text 노드라면 nodeValue가 바뀌었는지
      // (children.length && previous.length) && (isTextNode && nodeValue !== previous) && (Object.Keys(previos).every(key => props[key] === previos[key]))

      wipCursor.effectTag = "UPDATE";
      wipCursor.dom = currentCursor.dom;
      wipCursor.alternate = currentCursor;
    } else {
      deletions.push(currentCursor);
      wipCursor.effectTag = "PLACEMENT";
    }

    currentCursor = currentCursor.sibling;
    wipCursor = wipCursor.sibling;
  }

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

const useState = (initialState: any) => {
  let state = initialState;
  const setState = (value: any) => {};

  return [state, setState];
};

const Didact = {
  createElement,
  render,
  useState,
};

/** @jsx Didact.createElement */
function Counter() {
  // const [state, setState] = Didact.useState(1);

  // return <h1 onClick={() => setState((c) => c + 1)}>Count: {state}</h1>;
  return <h1>Counter Function Component</h1>;
}
const element = <Counter />;
const container = document.getElementById("root");
Didact.render(element, container);
