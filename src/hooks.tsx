import ResizeObserver from 'resize-observer-polyfill';
import { useRef, useState, useEffect, MutableRefObject, SetStateAction, Dispatch, useReducer } from 'react';

interface Bounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

export function useMeasure<T extends Element>(): [{ ref: MutableRefObject<T | null> }, Bounds] {
	const ref = useRef<T>(null);

	const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
	const [ro] = useState(() => new ResizeObserver(([entry]) => set(entry.contentRect)))
	useEffect(() => (ro.observe(ref.current!), () => ro.disconnect()), [])
	return [{ ref }, bounds]
}

export function useRefState<T>(state: [T, Dispatch<SetStateAction<T>>, boolean]) : [MutableRefObject<T>, () => void, boolean] {
	const ref = useRef<T>(state[0]);
	const [, forceUpdate] = useReducer(x => x + 1, 0);

	const setState = () => {
		state[1](ref.current);
		forceUpdate();
	};

	return [ref, setState, state[2]];
}
