import { useRefState, useMeasure } from "../hooks";
import { useContext, useState, useRef, useEffect } from "react";
import { UserData } from "../../pages";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { makeStyles, Paper, Button, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import Draggable from 'react-draggable';

import PersonAdd from '@material-ui/icons/PersonAddOutlined';
import { getCanvasScalar } from "./Canvas";

const CHAR_SIZE = 64;

const useStyles = makeStyles((theme) => ({
	img: {
		imageRendering: 'pixelated',
		width: '100%',
		height: '100%',
		backgroundSize: 'contain',
		backgroundPosition: 'center',
		backgroundRepeat: 'no-repeat',
		position: 'relative'
	},
	toolbar: {
		position: 'absolute',
		right: theme.spacing(2),
		top: 64 + theme.spacing(2),
		'& .MuiButton-root': {
			padding: 15
		}
	},
	canvas: {
		width: '100%',
		imageRendering: 'pixelated',
		background: 'white',
	},
	character: {
		imageRendering: 'pixelated',
		width: (charSize: number) => charSize,
		height: (charSize: number) => charSize,
		position: 'absolute',
		pointerEvents: 'inherit !important' as 'inherit',
	},
	'@global': {
		'.react-transform-component,.react-transform-element': {
			width: '100% !important',
			height: '100% !important',
		}
	}
}));


export default function CombatField() {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [scale, setScale] = useState(0.75);
	const [bind, { width, height }] = useMeasure<HTMLDivElement>();
	const [dragData, setDragData] = useState({
		ox: 0, oy: 0, x: 0, y: 0
	});
	const [data, setData] = useRefState(useContext(UserData));

	const map = data.current.entries[data.current.selectedIndex];
	const [open, setOpen] = useState(false);
	const [canDrag, setCanDrag] = useState(true);

	useEffect(() => {
		if (open && canvas.current !== null) {
			const ctx = canvas.current.getContext('2d')!;
			ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
		}
	}, [open]);

	useEffect(() => {
		if (canvas.current === null) return;
		const ctx = canvas.current.getContext('2d')!;
		const mouse = {
			down: false,
			lastX: 0,
			lastY: 0,
			x: 0,
			y: 0,
			button: 0
		};

		const mouseDown = (ev: globalThis.MouseEvent) => {
			ev.preventDefault();
			mouse.down = true;
			mouse.button = ev.button;
			return false;
		};
		let raf = 0;
		const mouseMove = (ev: globalThis.MouseEvent) => {
			if (!mouse.down) {
				mouse.lastX = mouse.x;
				mouse.lastY = mouse.y;
			}
			mouse.x = ev.offsetX;
			mouse.y = ev.offsetY;
		};
		const mouseUp = () => {
			mouse.down = false;
		};
		const rightClick = (ev: globalThis.MouseEvent) => {
			ev.preventDefault();
		}

		const tick = () => {
			if (mouse.down) {
				const scalar = canvas.current!.clientWidth / canvas.current!.width;
				ctx.beginPath();
				ctx.moveTo(mouse.lastX / scalar, mouse.lastY / scalar);
				mouse.lastX = mouse.x;
				mouse.lastY = mouse.y;
				ctx.lineTo(mouse.x / scalar, mouse.y / scalar);
				if (mouse.button === 2) {
					ctx.lineWidth = 3;
					ctx.globalCompositeOperation = 'destination-out';
				} else {
					ctx.lineWidth = 1.5;
					ctx.globalCompositeOperation = 'source-over';
				}
				ctx.strokeStyle = 'black';
				ctx.lineCap = 'round';
				ctx.stroke();
			}
			requestAnimationFrame(tick);
		}
		tick();


		canvas.current.addEventListener('mousemove', mouseMove);
		canvas.current.addEventListener('mousedown', mouseDown);
		canvas.current.addEventListener('mouseup', mouseUp);
		canvas.current.addEventListener('contextmenu', rightClick);
		// canvas.current.addEventListener('mouseout', mouseUp);
		return () => {
			cancelAnimationFrame(raf);
			if (canvas.current === null) return;
			canvas.current!.removeEventListener('mousemove', mouseMove);
			canvas.current!.removeEventListener('mousedown', mouseDown);
			canvas.current!.removeEventListener('mouseup', mouseUp);
			canvas.current!.removeEventListener('contextmenu', rightClick);
			// canvas.current!.removeEventListener('mouseout', mouseUp);
		}
	}, [canvas.current]);

	const classes = useStyles(CHAR_SIZE / map.feetPerPixel);
	return (
		<>
			<TransformWrapper onZoomChange={({ scale: s }: { scale: number }) => setScale(s)} wheel={{ step: 500 }} pan={{ disabled: !canDrag }} options={{ minScale: 0.75 }} defaultScale={0.75}>
				<TransformComponent>
					<div {...bind} className={classes.img} style={{ backgroundImage: `url(${map.mapData})` }} />
					{
						!canDrag && <Line point1={{ x: dragData.ox, y: dragData.oy }} point2={{ x: dragData.x, y: dragData.y }}
							scale={getCanvasScalar(width, height).scalar} feetPerPixel={map.feetPerPixel} />
					}

					{
						map.characters.map((char, i) =>
							<Draggable bounds="parent" defaultPosition={{ x: char.x, y: char.y }} scale={scale} key={i} allowAnyClick onStart={(_, data) => {
								setDragData({ x: data.x, y: data.y, ox: char.x, oy: char.y });
								setCanDrag(false);
							}} onDrag={(_, data) => {
								setDragData({ x: data.x, y: data.y, ox: char.x, oy: char.y });
							}} onStop={(_, data) => {
								setCanDrag(true);
								char.x = data.x;
								char.y = data.y;
								setData();
							}}>
								<img draggable={false} className={classes.character} style={{ cursor: canDrag ? 'grab' : 'grabbing', transform: 'scale' }} src={char.imageData} />
							</Draggable>
						)
					}
				</TransformComponent>
			</TransformWrapper>
			<Dialog maxWidth="xs" fullWidth keepMounted open={open} onClose={() => setOpen(false)}>
				<DialogTitle>Add Creature</DialogTitle>
				<DialogContent>
					<canvas ref={canvas} width={32} height={32} className={classes.canvas} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button onClick={() => {
						data.current.entries[data.current.selectedIndex].characters.push({
							x: window.innerWidth / 2,
							y: window.innerHeight / 2,
							imageData: canvas.current!.toDataURL()
						});
						setData();
						setOpen(false);
					}} color="secondary">Save</Button>
				</DialogActions>
			</Dialog>
			<Paper className={classes.toolbar}>
				<ButtonGroup size="large" orientation="vertical" >
					<Button value="add" onClick={() => setOpen(true)}>
						<PersonAdd htmlColor="#2ecc71" />
					</Button>
				</ButtonGroup>
			</Paper>
		</>
	);
}

interface Point {
	x: number;
	y: number;
}

interface LineProps {
	point1: Point;
	point2: Point;
	scale: number;
	feetPerPixel: number;
}

function Line({ point1, point2, scale, feetPerPixel }: LineProps) {
	let { x: x1, y: y1 } = point1;
	let { x: x2, y: y2 } = point2;
	x1 += (CHAR_SIZE / feetPerPixel) / 2;
	y1 += (CHAR_SIZE / feetPerPixel) / 2;
	x2 += (CHAR_SIZE / feetPerPixel) / 2;
	y2 += (CHAR_SIZE / feetPerPixel) / 2;
	var length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
	var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
	const positionStyles = {
		position: 'absolute' as 'absolute',
		left: x1, top: y1,
	};
	return (
		<>
			<div style={{
				...positionStyles,
				width: length, height: 3,
				background: 'black',
				transform: `rotate(${angle}deg)`, transformOrigin: '0 100%'
			}}
			/>
			<div style={{
				...positionStyles,
				background: 'black',
				color: 'white'
			}}>{Math.round(length / scale * feetPerPixel)} ft</div>
		</>
	);
}