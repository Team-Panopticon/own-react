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

  const dom =
    type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(type);

  const { children, ...props } = fiber.props;

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));

  return dom;
}

/** Root Element를 렌더링하는 함수 */
function render(fiber: FiberWithoutDom, rootElement: HTMLElement) {
  // 1. rootElement을 어디다가 둘 것 인가

  wipRoot = {
    type: "",
    props: {
      children: [],
    },
    dom: document.createDocumentFragment(),
    container: rootElement,
  };
  fiber.container = wipRoot.dom as DocumentFragment;

  nextUnitOfWork = fiber;
}

// 1. createElement
// 2. render
//    - 어떻게 할당할 것인가?
//    - Didact.render() -> 반환값도 없어, render 내부에서 밖에 못함

// 1 순위. child[0]
// 2 순위. 내 sibling
// 3 순위. parent Sibling
// A -> B( ,0) -> E(C,0) => F(G,0)
//                       => K(G,1)
//             -> G(C,1)
//   -> C( ,1)
//   -> D( ,2) -> H

// A -> B(c) -> E(G) => F(K)
//                   => K(g)
//           -> G(c)
//   -> C(d)
//   -> D(null)

let nextUnitOfWork: Fiber | null = null;
let wipRoot: Fiber | null = null;

// @ts-ignore
window.getNextUnifOfWork = () => nextUnitOfWork;

function isHTMLElement(fiber: Fiber): fiber is Fiber<HTMLElement> {
  return fiber.type !== "TEXT_ELEMENT" ? true : false;
}

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  const dom = createDOM(nextUnitOfWork); // parentdom.appendchild(dom)

  nextUnitOfWork.dom = dom;
  nextUnitOfWork.container.appendChild(dom);

  const {
    nextFiber,
    props: { children },
  } = nextUnitOfWork;

  children.forEach((child, i) => {
    if (i === children.length - 1) {
      child.nextFiber = nextFiber;
    } else {
      child.nextFiber = children[i + 1];
    }
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
    wipRoot = null;
    return;
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

const container = document.getElementById("root");

Didact.render(element, container);

/**
 * TODO: 3월 9(토) 기록
 * 피그마: https://www.figma.com/file/luPXN9RuboNhjiGBbrTMip/Untitled?type=whiteboard&node-id=0%3A1&t=TpBGQaDjvqaol1OR-1
 *
 * 1. 렌더링 순서 (DOM에 붙이는거) -> 자식이 부모의 DOM에 직접 붙여야한다 ( fiber에 parent를 들고있어야한다??)
 *
 *
 * 2. 가상 DOM이 변경되면 실제 DOM에 반영한다.(커밋한다)
 */
