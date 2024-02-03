import { dummy } from "./dummy";

function createElement(type, props, ...children: Fiber[]): Fiber {
  return {
    type,
    props: {
      ...props,
      children: children.map((child, i) => {
        if (typeof child === "object") {
          child.index = i;
          return child;
        } else {
          return createTextElement(child, i);
        }
      }),
    },
    index: 0,
  };
}

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

// TODO: 2월 7일(수) - 첫 render를 부르는 시점에 nextOfUnitWork에 일이 할당되어야함.
// 일이 어디서 할당되어야 하는지 고민이 필요하다 (분기 vs 분리)
function render(fiber: Fiber, container: HTMLElement) {
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
interface Fiber {
  type: string;
  props: Props;
  /** 현재 Fiber의 HTMLElement */
  dom?: HTMLElement | Text;
  /** Fiber (parentDom + parentSibling을 얻기 위해서) */
  parentFiber?: Fiber;
  /** parentFiber.children[index] === 현재 Fiber */
  index: number;
}

// interface Fiber extends Element {
//   /** 현재 Fiber의 HTMLElement */
//   dom?: HTMLElement | Text;
//   /** Fiber (parentDom + parentSibling을 얻기 위해서) */
//   parentFiber?: Fiber;
//   /** parentFiber.children[index] === 현재 Fiber */
//   index: number;
// }

interface Props {
  [key: string]: any;
  nodeValue?: string;
  children: Fiber[];
}

/** */
function createFiber(fiber: Fiber): Fiber {
  // 1.
  return {} as Fiber;
}

let nextUnitOfWork: Fiber | null = null;

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  const dom = render(
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
    const myParentSibling =
      nextUnitOfWork.parentFiber.parentFiber[
        nextUnitOfWork.parentFiber.index + 1
      ];

    return myChild || mySibling || myParentSibling || null;
  })();

  nextFiber && (nextFiber.parentFiber = nextUnitOfWork);

  return nextFiber;
}

function workLoop(deadline) {
  let shouldYield = false;
  debugger;
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
    <a>This is A</a>
    <c>this is C</c>
    <b />
  </div>
);

const container = document.getElementById("root");

Didact.render(element, container);
