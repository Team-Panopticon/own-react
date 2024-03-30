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
    alternate: currentRoot,
  };

  fiber.container = wipRoot.dom as DocumentFragment;
  fiber.parent = wipRoot;

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
let wipRoot: Fiber | null = null; // 돔에 변경사항이 생겼을때 교정할거
let currentRoot: Fiber | null = null; // currentRoot -> 완성이 되어있어있고 실제돔에도 적용되어 있음.

// wipRoot[A] - alternate - currontRoot[A] 새로 생긴 친구

// render(element) -> wipRoot
// render(element') -> wipRoot

// element -> diact.createElement -> dom이 없는 fiber tree - 이전 돔 -> current
// element' -> diact.creatElement -> dom이 없는 fiber tree - 새롭게 돔이 추가됨. -> wipRoot 조정.

// wipRoot 새로 만들지 않는다?

// 초기단계 -> wipRoot -> currentRoot
// -> wipRoot->alternate

// @ts-ignore
window.getNextUnifOfWork = () => nextUnitOfWork;
// @ts-ignore
window.setNextUnitOfWork = (fiber) => {
  nextUnitOfWork = fiber;
};

function isHTMLElement(fiber: Fiber): fiber is Fiber<HTMLElement> {
  return fiber.type !== "TEXT_ELEMENT" ? true : false;
}

function performUnitOfWork(nextUnitOfWork: Fiber): Fiber {
  // 1번째
  // <div id="foo" />
  // wipRoot.children[0]
  // parent.alternate
  //   '  '
  // parent.alternate.children = [1, 2 ,3]
  // wipRoot.children =          [1, 2(deletion), 3(placement)]
  // wipRoot.children =          [1, 0, 2, 3]

  /**
   * @TODO 3월 30일 (토)
   * - children끼리 비교할 때, 어떤 child가 삭제, 수정, 추가 되었는지
   *   비교할 수 있는 n^2이 아닌 알고리즘이 필요하다.
   *
   * - 1, 2, 3 -> 1, 0, 2, 3일 때 2, 3은 PLACEMENT인가?
   *   react 배열 렌더링할 때 PLACEMENT인데 리랜더링 방지해주기 위해 key가 필요한게 아닐까?
   */

  // 없음 -> PLACEMENT
  nextUnitOfWork.parent.alternate.props.children.forEach((child) => {});

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

  // nextUnitOfWork, alternate
  // nextUnitOfWork alternate 비교해야함
  // effectTag를 어디에 마킹해야하는가 -> nextUnitOfWork
  //

  // const elements = fiber.props.children
  // // 새로운 fiber를 생성하는 코드를 reconcileChildren 내부로 옮깁니다.
  // reconcileChildren(fiber, elements)

  // function reconcileChildren(wipFiber, elements) {
  // wipRoot.alternate === currentRoot
  // let oldFiber =
  // wipFiber.alternate && wipFiber.alternate.child
  //
  // const elements = nextUnitOfWork.props.children
  // while (
  //   index < elements.length ||
  //   oldFiber != null
  // )

  children.forEach((child, i) => {
    if (i === children.length - 1) {
      // child.alternate = nextUnitOfWork.alternate.props.child[i];
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

/** @jsx Didact.createElement */
var element2 = (
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

/**
 * TODO: 3월 23(토) 기록
 * 피그마: https://www.figma.com/file/luPXN9RuboNhjiGBbrTMip/Untitled?type=whiteboard&node-id=0%3A1&t=TpBGQaDjvqaol1OR-1
 *
 * - node가 변경됐을때 새로운 트리가 만들어지는게 아니고 wipRoot에 추가되는 것으로 생각하고 구현해야하는가? => 어떻게 구현할것인지 고민이 필요하다
 * - 새로운 트리가 만들어지면, 이전 트리랑 비교해야함
 * -
 *
 */

/**
 * - 렌더링 순서 (DOM에 붙이는거) -> 자식이 부모의 DOM에 직접 붙여야한다 ( fiber에 parent를 들고있어야한다??)
 *
 * - 텍스트 바뀌었을 때 리렌더링 되도록 구현해보기 (리랜더링 테스트용)
 * - 렌더링할 때 단순히 appendChild하면 새로운 Fiber가 appendChild 되버림
 * - wipRoot 할당해주는거 빼야됨 (리랜더링 할 때 root가 없으므로) but wipRoot가 리랜더링 해야되는 부모로 할 수 있을까...?
 * - 변경사항이 있는 경우에만 렌더링을 실행하도록 해야함
 * - 변경사항 -> 일단 perfornUnitOfWork에서 해버리기 (생각하는걸 줄이기 위해서)
 */

// ========== 블로그에 있는 내용임 =============
//
// 디액트에서는 렌더 단계의 모든 트리를 순회하지만 실제 리액트는 대신 특정한 힌트만을 따라가며 변하지 않은 서브 트리는 휴리스틱하게 뛰어넘습니다.
// 디액트는 커밋 단계에서도 모든 트리를 순회합니다. 하지만 리액트는 영향이 가는 fiber들의 연결 리스트를 유지하여 해당 fiber만 방문합니다.
// 작업중(wip)인 트리를 생성할 때마다 우리는 각 fiber에 새로운 객체를 생성했지만, 리액트는 이전의 트리에서 가져온 fiber를 재사용합니다.
// 디액트는 렌더 단계에서 새로운 갱신을 얻을 때 작업중(wip)인 트리를 버리고 루트에서부터 새로 시작하지만, 리액트는 각 갱신의 만료 타임스탬프를 표시해두고, 갱신시 이를 높은 우선순위로 참고하여 결정합니다.
// 그 외에도 많은 것들이 다릅니다.

// if (element && !sameType) {
//   newFiber = {
//     type: element.type,
//     props: element.props,
//     dom: ,
//     parent: wipFiber,
//     alternate: id=1, => current에 있는 fiber
//     effectTag: "PLACEMENT", || 'DELETION' || "UPDATE"
//   }
// }
// ==========================================

/**
 * wipRoot 트리
 * 1. wip Tree vs 만들고 있는 tree
 * 2. wipRoot에 새로운 트리가 완성이 됨. (만들고 있는 tree가 wipTree에 반영이 됨)
 * 3. wipRoot를 다시 비교
 */

// current / wip

// 1. 'UPDATE' : oldFiber와 새로운 엘리먼트의 타입이 같다면, DOM 노드를 유지하고 새로운 props만 업데이트 합니다.
// 2. 'PLACEMENT': 타입이 다르면서 새로운 엘리먼트가 존재한다면, 새로운 DOM 노드를 생성합니다.
// 3. 'DELETION' : 타입이 다르면서 oldFiber가 존재한다면, 해당 DOM 노드를 삭제합니다.
