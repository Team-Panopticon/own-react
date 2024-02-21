import { dummy } from "./dummy";

interface Props {
  nodeValue?: string;
  children: Fiber[];
  [key: string]: any;
}

interface Fiber {
  type: string;
  props: Props;
  /** 현재 Fiber의 HTMLElement */
  dom?: HTMLElement | Text;
  /** parent의 DOM */
  container?: HTMLElement;
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

function renderDOM(fiber: FiberWithoutDom) {
  const { type, nextFiber } = fiber;

  const dom =
    type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(type);

  const { children, ...props } = fiber.props;

  children.forEach((child, i) => {
    if (i === children.length - 1) {
      child.nextFiber = nextFiber;
    } else {
      child.nextFiber = children[i + 1];
    }
    if (type !== "TEXT_ELEMENT") {
      // TO-DO
      // @ts-ignore
      child.container = dom;
    }
  });

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));

  fiber.container.appendChild(dom);

  return dom;
}

/** Root Element를 렌더링하는 함수 */
function render(fiber: FiberWithoutDom, rootElement: HTMLElement) {
  fiber.container = rootElement;
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
// @ts-ignore
window.getNextUnifOfWork = () => nextUnitOfWork;

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  const dom = renderDOM(nextUnitOfWork); // parentdom.appendchild(dom)
  nextUnitOfWork.dom = dom;

  const { props, nextFiber } = nextUnitOfWork;

  return nextUnitOfWork.props.children[0] || nextFiber;
}

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
    depth 1
    <p>
      depth 2 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This is A
      <ab>depth 3 This is AB</ab> depth 2 Th
    </p>
    <c>depth 2 this is C</c>
    <br />
    tt
    <div id="foo">
      depth 1
      <p>
        depth 2 This is A<ab>depth 3 This is AB</ab> depth 2 Th depth 2 This is
        A<ab>depth 3 This is AB</ab> depth 2 Th
      </p>
      <c>depth 2 this is C</c>
      <br />
      tt
    </div>
  </div>
);

const container = document.getElementById("root");

Didact.render(element, container);

/**
 * TODO: 2월 21(수) - 기록
 * - 엣지 케이스가 없을까?
 * - render와 renderDom을 합칠 수 있을지?
 *  - 실제 코드랑 비교해보기
 *    - nextFiber를 저장하는 구조일까?
 *    - child가 없을 때 nextFiber를 렌더링하는 구조일까?
 *    - render와 renderDom이 하나인지?
 *
 */
