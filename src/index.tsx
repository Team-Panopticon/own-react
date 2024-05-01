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

  console.log(">> render - wipRoot", wipRoot);

  nextUnitOfWork = wipRoot;
  requestIdleCallback(workLoop);
}

let nextUnitOfWork: Fiber | null = null;
let wipRoot: Fiber | null = null; // 돔에 변경사항이 생겼을때 교정할거
let currentRoot: Fiber | null = null; // currentRoot -> 완성이 되어있어있고 실제돔에도 적용되어 있음.

function isHTMLElement(fiber: Fiber): fiber is Fiber<HTMLElement> {
  return fiber.type !== "TEXT_ELEMENT" ? true : false;
}

function commitRoot() {
  commitWork(currentRoot.props.children[0]);
  wipRoot.dom.appendChild(currentRoot.props.children[0].dom);
}

function isProps(prop: string) {
  return prop !== "children";
}

function isEvent(prop: string) {
  return prop.startsWith("on");
}

function isNotEvent(prop: string) {
  return isEvent(prop);
}

function updateDom(fiber: Fiber) {
  const dom = fiber.dom;
  const newProps = fiber.props;
  const oldProps = fiber.alternate?.props;

  console.log(">> updateDom", fiber);

  // 1. 오래된 props를 지운다.
  Object.keys(oldProps)
    .filter(isProps)
    .filter(isNotEvent)
    .forEach((key) => (dom[key] = ""));
  // 2. 새로운 props를 dom 추가한다.
  Object.keys(newProps)
    .filter(isProps)
    .filter(isNotEvent)
    .forEach((key) => (dom[key] = newProps[key]));
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

function commitWork(currentFiber: Fiber) {
  console.log("commitWork >> currentFiber: ", currentFiber);
  if (currentFiber.effectTag === "DELETION") {
    currentFiber.parent.dom.appendChild(document.createDocumentFragment());
  } else if (currentFiber.effectTag === "PLACEMENT") {
    currentFiber.props.children.forEach((child) => {
      commitWork(child);
    });
    currentFiber.parent.dom.appendChild(currentFiber.dom);
  } else if (currentFiber.effectTag === "UPDATE") {
    currentFiber.props.children.forEach((child) => {
      commitWork(child);
    });
    updateDom(currentFiber);
  }
}

/**
 * @TODO
 * wipRoot를 기준으로 돌고 있다.
 * currentRoot와 wipRoot를 비교해서 wipRoot에 effectTag를 세팅해야한다.
 * deletions 배열을 만들어서 currentRoot있지만 wipRoot에서 사라진 Fiber를 저장한다.
 * commit 단계에서 deletions 배열을 돌면서 삭제를 실행한다.
 * - 이렇게 해야 wipRoot는 현재 dom(html)의 구조와 일치하게 fiber를 가지고 있다.
 */
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

  if (!alternate) {
    // ROOT
    while (wipCursor) {
      wipCursor.effectTag = "PLACEMENT";
      wipCursor = wipCursor.sibling;
    }
  } else {
    while (currentCursor || wipCursor) {
      if (currentCursor && !wipCursor) {
        currentCursor.effectTag = "DELETION";
        currentCursor = currentCursor.sibling;
        continue;
      }

      if (wipCursor && !currentCursor) {
        const lastIndex = alternate?.props.children.length - 1;
        let newFiber: Fiber = {
          ...wipCursor,
          effectTag: "PLACEMENT",
        };
        children.push(newFiber);
        const last = alternate?.props.children[lastIndex];
        last.sibling = newFiber;

        wipCursor = wipCursor.sibling;
        continue;
      }

      if (currentCursor.type === wipCursor.type) {
        // props를 돌면서 각 props가 바뀌었는지랑, children이 길이가 바뀌었는지, text 노드라면 nodeValue가 바뀌었는지
        // (children.length && previous.length) && (isTextNode && nodeValue !== previous) && (Object.Keys(previos).every(key => props[key] === previos[key]))
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
    }
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
    if (!currentRoot) {
      currentRoot = wipRoot;
    }
    commitRoot();
    // currentRoot = wipRoot;
    wipRoot = null;
    return;
  }
  requestIdleCallback(workLoop);
}

const Didact = {
  createElement,
  render,
};

// /** @jsx Didact.createElement */
// const element = (
//   <div id="foo">
//     depth 1
//     <p>
//       depth 2 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This is A
//       <ab>depth 3 This is AB</ab> depth 2 Th
//     </p>
//     <c>depth 2 this is C</c>
//     <br />
//     tt
//     <div id="bar">
//       depth 1-1
//       <p>
//         depth 2-1 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This
//         is A<ab>depth 3 This is AB</ab> depth 2 Th
//       </p>
//       <c>depth 2-1 this is C</c>
//       <br />
//       tt
//     </div>
//   </div>
// );

/** @jsx Didact.createElement */
const rootEl = document.getElementById("root");

// Didact.render(element, rootEl);

const updateValue = (e) => {
  console.log("updateValue Function"); // 이벤트가 동작하지 않음
  rerender(e.target.value);
};

/**
 * @TODO 아래 코드가 정상적으로 작동해야함.
 * 인풋이 처음엔 그려지는데, 그 다음에는 그려지 않음. (이벤트 추가 안됨)
 */
const rerender = (value) => {
  /** @jsx Didact.createElement */
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  );

  Didact.render(element, rootEl);
};

rerender("World");
