export interface Props {
  nodeValue?: string;
  children: Fiber[];
  [key: string]: any;
}

type FunctionComponent = (props: any) => Fiber;

export interface Fiber<T = HTMLElement | Text | DocumentFragment> {
  type: string | FunctionComponent;
  props: Props;
  /** 현재 Fiber의 HTMLElement */
  dom?: T;
  sibling?: Fiber;
  /** root는 parent가 없음 */
  parent?: Fiber;
  alternate?: Fiber;
  effectTag?: "PLACEMENT" | "UPDATE";
  hooks?: any[];
}

export type FiberWithoutDom = Fiber;
