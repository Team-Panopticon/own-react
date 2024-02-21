import { dummy } from "./dummy";

interface Props {
  nodeValue?: string;
  children: Fiber[];
  [key: string]: any;
}

interface Fiber {
  type: string;
  props: Props;
  /** Fiber (parentDom + parentSibling을 얻기 위해서) */
  parentFiber?: Fiber;
  /** 현재 Fiber의 HTMLElement */
  dom?: HTMLElement | Text;
  /** parentFiber.children[index] === 현재 Fiber */
  index: number;
}

type FiberWithoutDom = Fiber;

function createElement(type, props, ...children: Fiber[]): FiberWithoutDom {
  const fiber = {
    type,
    props: {
      ...props,
      children,
    },
    index: 0,
  };

  fiber.props.children = children.map((child, i) => {
    if (typeof child === "object") {
      child.index = i;
      child.parentFiber = fiber;
      return child;
    } else {
      const textEl = createTextElement(child, i);
      textEl.parentFiber = fiber;
      return textEl;
    }
  });

  return fiber;
}

/*
 * 1. const element = Didact.createElement(
//   "div",
//   { id: "foo" },
//   Didact.createElement("a", null, "bar"),
//   Didact.createElement("b")
// );
 */

function createTextElement(text, index: number): Fiber {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
    index,
  };
}

/**
 * render - nextUnifOfWork에 할당만
 */

// TODO: 2월 7일(수) - 첫 render를 부르는 시점에 nextOfUnitWork에 일이 할당되어야함.
// 일이 어디서 할당되어야 하는지 고민이 필요하다 (분기 vs 분리)
function renderDOM(fiber: FiberWithoutDom, container: HTMLElement) {
  const { type } = fiber;

  const dom =
    type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(type);

  const { children, ...props } = fiber.props;

  Object.entries(props).forEach(([key, value]) => (dom[key] = value));

  container.appendChild(dom);

  return dom;
}

/** Root Element를 렌더링하는 함수 */
function render(fiber: FiberWithoutDom, container: HTMLElement) {
  /**
   * 1. <element /> <- 요거를 그리려고하는거고
   * 2. <div id='root'></div> <- root 최고 parentFiber
   */

  fiber.parentFiber = {
    type: "root",
    props: {
      children: [fiber],
    },
    dom: container,
    index: 0,
  };

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
//   -> D( ,2)

/** */
function createFiber(fiber: Fiber): Fiber {
  // 1.
  return {} as Fiber;
}

let nextUnitOfWork: Fiber | null = null;
// @ts-ignore
window.getNextUnifOfWork = () => nextUnitOfWork;

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  const dom = renderDOM(
    nextUnitOfWork,
    nextUnitOfWork.parentFiber.dom as HTMLElement
  ); // parentdom.appendchild(dom)
  nextUnitOfWork.dom = dom;

  const {
    props,
    index,
    parentFiber: {
      props: { children: sibling },
    },
  } = nextUnitOfWork;

  const nextFiber = ((): Fiber | null => {
    const myChild = props.children[0];
    const mySibling = sibling[index + 1];
    // const myParentSibling =
    //   nextUnitOfWork.parentFiber.parentFiber?.[
    //     nextUnitOfWork.parentFiber.index + 1
    //   ];

    /**
     * Fiber에서 부모의 sibling을 직접 찾을 경우 부모의 부모 이상의 sibling을 렌더링해야도리 때 코드가 복잡해짐
     */
    const myParentSibling =
      nextUnitOfWork.parentFiber.parentFiber?.props?.children?.[
        nextUnitOfWork.parentFiber.index + 1
      ];

    return myChild || mySibling || myParentSibling || null;
  })();
  console.group("performUnitOfWork");
  console.log("nextUnitOfWork", nextUnitOfWork);
  console.log("nextFiber", nextFiber);
  console.groupEnd();

  return nextFiber;
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
      depth 2 This is A<ab>depth 3 This is AB</ab>
    </p>
    <c>depth 2 this is C</c>
    <b />
  </div>
);

const container = document.getElementById("root");

Didact.render(element, container);
