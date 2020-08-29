import { useRef, useEffect, useState, MouseEvent, WheelEvent, forwardRef, useImperativeHandle, useContext } from "react";
import { useMeasure, useRefState } from "../hooks";
import { makeStyles, Paper, Menu, Slider, ListItem, ListItemText, ListItemSecondaryAction, debounce, Typography } from '@material-ui/core';
import { ToggleButtonGroup, ToggleButton } from '@material-ui/lab';
import Pencil from '@material-ui/icons/CreateOutlined';
import FillBucket from '@material-ui/icons/FormatColorFillOutlined';
import Eraser from 'mdi-material-ui/Eraser';

import Mountain from '@material-ui/icons/FilterHdrOutlined';
import BlurOn from '@material-ui/icons/BlurOn';
import Water from 'mdi-material-ui/Waves';
import Grass from 'mdi-material-ui/Grass';
import { UserData } from "../../pages";

const WIDTH = 192;
const HEIGHT = 108;

// const ScaleSlider = withStyles((theme) => ({
// 	root: {
// 		margin: theme.spacing(1)
// 	},
// 	thumb: {
// 		width: 2,
// 		borderRadius: 0,
// 		height: 20,
// 		marginLeft: 0,
// 		'&:focus, &:hover': {
// 			boxShadow: 'inherit',
// 		}
// 	},
// 	track: {
// 		display: 'none'
// 	},
// 	rail: {
// 		bottom: 0
// 	}
// }))(Slider);

const useStyles = makeStyles((theme) => ({
	canvas: {
		width: '100%',
		height: '100%',
		background: theme.palette.background.default,
		// cursor: 'none'
	},
	toolbar: {
		position: 'absolute',
		right: theme.spacing(2),
		top: 64 + theme.spacing(2),
	},
	scaleIndicator: {
		position: 'absolute',
		right: theme.spacing(2),
		bottom: theme.spacing(2),
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 200,
		height: 56,
		paddingLeft: theme.spacing(2),
		'&>p': {
			whiteSpace: 'nowrap',
			fontSize: 12
		}
	},
	slider: {
		marginRight: theme.spacing(1),
		marginLeft: theme.spacing(1),
	},
	contextMenu: {
		padding: theme.spacing(2),
	},
	thirtyFootIndicator: {
		position: 'absolute',
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%)',
		borderTopColor: 'transparent',
		borderLeftColor: 'black',
		borderRightColor: 'black',
		borderBottomColor: 'black',
		color: 'black',
		textAlign: 'center',
		borderStyle: 'solid',
		borderWidth: 2,
	}
}));

type _MouseEvent = MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>;

interface MouseData {
	x: number;
	y: number;
	lastX: number;
	lastY: number;
	down: boolean;
	justClicked: boolean;
}

export function getCanvasScalar(width: number, height: number): { xOffset: number, scalar: number, yOffset: number } {
	const widthScalar = width / WIDTH;
	const heightScalar = height / HEIGHT;
	let scalar: number, xOffset = 0, yOffset = 0;
	if (WIDTH * heightScalar > width) {
		scalar = widthScalar;
		yOffset = (height - (HEIGHT * widthScalar)) / 2;
	}
	else {
		scalar = heightScalar;
		xOffset = (width - (WIDTH * heightScalar)) / 2;
	}
	return { xOffset, scalar, yOffset };
}

export default function Canvas() {
	const classes = useStyles();
	const [data, setData] = useRefState(useContext(UserData));

	const context = useRef<any>(null);
	const [tempScale, setTempScale] = useState(-1);
	const [bind, { width, height }] = useMeasure<HTMLCanvasElement>();
	const canvas = bind.ref.current;
	const mouse = useRef<MouseData>({
		x: 0,
		y: 0,
		lastX: 0,
		lastY: 0,
		justClicked: false,
		down: false
	});
	const map = data.current.entries[data.current.selectedIndex];

	useEffect(() => {
		if (canvas === null) return;

		function floodFill(localCtx: CanvasRenderingContext2D, x: number, y: number, fillColor: number) {
			const DEBUG = false;
			function getPixel(pixelData: {
				width: number;
				height: number;
				data: Uint32Array;
			}, x: number, y: number) {
				if (x < 0 || y < 0 || x >= pixelData.width || y >= pixelData.height) {
					return -1;  // impossible color
				} else {
					return pixelData.data[y * pixelData.width + x];
				}
			}

			// read the pixels in the canvas
			const imageData = localCtx.getImageData(0, 0, WIDTH, HEIGHT);

			// make a Uint32Array view on the pixels so we can manipulate pixels
			// one 32bit value at a time instead of as 4 bytes per pixel
			const pixelData = {
				width: imageData.width,
				height: imageData.height,
				data: new Uint32Array(imageData.data.buffer),
			};
			// get the color we're filling fuck mkby
			const targetColor = getPixel(pixelData, x, y);

			const getColorValues = (color: number): [number, number, number] => {
				const r = color & 0xff;
				const g = (color >> 8) & 0xff;
				const b = (color >> 16) & 0xff;
				return [r, g, b];
			}

			const pixelDifferences = (color1: number, color2: number): [number, number, number] => {

				const [r1, g1, b1] = getColorValues(color1);
				const [r2, g2, b2] = getColorValues(color2);

				return [r1 - r2, g1 - g2, b1 - b2];
			}

			const pixelsMatch = ([rd, gd, bd]: [number, number, number]): boolean => {
				const THRESHOLD = 0xff * 0.05;
				return Math.abs(rd) < THRESHOLD && Math.abs(bd) < THRESHOLD && Math.abs(gd) < THRESHOLD;
			};
			const getCss = (color: number, appendPrefix: boolean = true): string => {
				const str = color.toString(16);
				return (appendPrefix ? 'color: ' : '') + '#' + str.substring(6, 8) + str.substring(4, 6) + str.substring(2, 4);
			}

			function lerp(a: number, b: number, u: number) {
				return (1 - u) * a + u * b;
			}
			const blend = (color: number, [r2, g2, b2]: [number, number, number], opacity: number): number => {
				let [r1, g1, b1] = getColorValues(color);

				let newR = lerp(r1, r2, opacity);
				let newG = lerp(g1, g2, opacity);
				let newB = lerp(b1, b2, opacity);

				return newR + (newG << 8) + (newB << 16) + (0xff000000);
			};
			const checkedPixels = new Set();

			const NEIGHBORS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];
			// check we are actually filling a different color
			const colorsToSet: {
				x: number,
				y: number,
				color: number
			}[] = [];
			if (targetColor !== fillColor) {

				const pixelsToCheck = [x, y];
				while (pixelsToCheck.length > 0) {
					const y = pixelsToCheck.pop()!;
					const x = pixelsToCheck.pop()!;
					if (checkedPixels.has(x + " " + y)) continue;
					checkedPixels.add(x + " " + y);

					const oldColor = getPixel(pixelData, x, y);
					const diffs = pixelDifferences(oldColor, targetColor);
					const matches = pixelsMatch(diffs);
					// console.log(oldColor.toString(16), targetColor.toString(16), diffs);
					if (matches) {
						colorsToSet.push({
							x, y, color: fillColor
						});
						if (x < pixelData.width - 1)
							pixelsToCheck.push(x + 1, y);
						if (x > 0)
							pixelsToCheck.push(x - 1, y);
						if (y < pixelData.height - 1)
							pixelsToCheck.push(x, y + 1);
						if (y > 0)
							pixelsToCheck.push(x, y - 1);
					} else {
						if (DEBUG)
							console.log(`Filling %c█${oldColor.toString(16)} at (${x}, ${y}) with %c█${fillColor.toString(16)}`, getCss(oldColor), getCss(fillColor));


						let max = 0;
						let indexOfMaxDifference = 0;
						for (let i = 0; i < NEIGHBORS.length; i++) {
							let nearby = NEIGHBORS[i];
							let nx = x + nearby[0],
								ny = y + nearby[1];
							if (nx < 0 || nx > pixelData.width - 1 || ny < 0 || ny > pixelData.height - 1) continue;
							let diffs = pixelDifferences(
								getPixel(pixelData, nx, ny),
								targetColor
							);
							if (DEBUG) console.log("Diffs", diffs);
							const averageDiff = diffs.reduce((a, b) => a + Math.abs(b), 0) / 3;
							if (averageDiff > max) {
								max = averageDiff;
								indexOfMaxDifference = i;
							}
						}
						if (DEBUG)
							console.log("Neighbor of max difference:", NEIGHBORS[indexOfMaxDifference],
								getPixel(pixelData, x + NEIGHBORS[indexOfMaxDifference][0], y + NEIGHBORS[indexOfMaxDifference][1]).toString(16),
								targetColor.toString(16));
						const predictedOriginalColor = getPixel(pixelData, x + NEIGHBORS[indexOfMaxDifference][0], y + NEIGHBORS[indexOfMaxDifference][1]);
						const colorDifferences = pixelDifferences(predictedOriginalColor, targetColor);
						const targetColorChannels = getColorValues(targetColor);
						const transparentColorChannels = getColorValues(oldColor);
						const originalColorChannels = getColorValues(predictedOriginalColor);
						let predictedOpacity = 0;
						for (let i = 0; i < 3; i++) {
							predictedOpacity += (transparentColorChannels[i] - targetColorChannels[i]) / (colorDifferences[i]);
						}
						predictedOpacity /= 3;
						predictedOpacity = Math.max(0, Math.min(1, predictedOpacity));

						if (DEBUG)
							console.log(`Base: %c█${targetColor.toString(16)} Line Color: %c█${predictedOriginalColor.toString(16)} Opacity: ${predictedOpacity}`, getCss(targetColor), getCss(predictedOriginalColor));
						const blended = blend(fillColor, originalColorChannels, predictedOpacity);
						if (DEBUG)
							console.log(`Blended color: %c${blended.toString(16)}`, getCss(blended));
						colorsToSet.push({
							x, y, color: blended
						});
					}
				}
				if (DEBUG)
					console.log(colorsToSet);
				for (let c of colorsToSet) {
					pixelData.data[c.y * pixelData.width + c.x] = c.color;
				}
				// put the data back
				localCtx.putImageData(imageData, 0, 0);
			}
		}
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;
		const mouseDown = (ev: globalThis.MouseEvent) => {
			if (ev.button === 0) {
				mouse.current.down = true;
				mouse.current.justClicked = true;
			}
			return false;
		};
		const mouseMove = (ev: globalThis.MouseEvent) => {
			if (!mouse.current.down) {
				mouse.current.lastX = mouse.current.x;
				mouse.current.lastY = mouse.current.y;
			}
			mouse.current.x = ev.offsetX;
			mouse.current.y = ev.offsetY;
		};
		let raf: number = 0;
		const saveCanvas = debounce(() => {
			// return;
			// console.log(bCtx);
			data.current.entries[data.current.selectedIndex].mapData = canvasBuffer.toDataURL('image/png');
			setData();
		}, 200);

		const canvasBuffer = document.createElement('canvas');
		canvasBuffer.width = WIDTH;
		canvasBuffer.height = HEIGHT;
		const bCtx = canvasBuffer.getContext('2d')!;
		bCtx.fillStyle = 'white';
		bCtx.fillRect(0, 0, canvasBuffer.width, canvasBuffer.height);
		if (data.current.entries[data.current.selectedIndex]?.mapData) {
			var savedImage = new Image();
			savedImage.onload = function () {
				bCtx.drawImage(savedImage, 0, 0);
				savedImage.remove();
			};
			savedImage.src = data.current.entries[data.current.selectedIndex].mapData;
		} else {
			saveCanvas();
		}
		function getToolColor(): string {
			if (data.current.tools.selectedTool !== 'eraser') {
				switch (data.current.tools.brushType) {
					case "mountain":
						return '#95a5a6';
					case 'water':
						return '#41658A';
					case 'grass':
						return '#70A37F';
					case 'sand':
						return '#debb83';
					case 'dirt':
						return '#5C4742';
				}
			} else {
				return '#ffffff';
			}
		}
		const tick = () => {
			ctx.fillStyle = '#303030';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.imageSmoothingEnabled = false;
			bCtx.imageSmoothingEnabled = false;
			let { xOffset, scalar, yOffset } = getCanvasScalar(canvas.width, canvas.height);
			const getScaledMousePosition = (x: number, y: number): { x: number, y: number } => {
				return {
					x: (x - xOffset) / scalar,
					y: (y - yOffset) / scalar,
				};
			};
			if (data.current.tools.selectedTool === 'fill') {
				if (mouse.current.justClicked) {
					const mousePos = getScaledMousePosition(mouse.current.x, mouse.current.y);
					let color = getToolColor().substring(1);
					color = 'ff' + color.substring(4, 6) + color.substring(2, 4) + color.substring(0, 2);
					floodFill(bCtx, Math.floor(mousePos.x), Math.floor(mousePos.y), parseInt(color, 16));
					saveCanvas();
				}
			} else {
				if (mouse.current.down) {
					const prevMousePos = getScaledMousePosition(mouse.current.lastX, mouse.current.lastY);
					const mousePos = getScaledMousePosition(mouse.current.x, mouse.current.y);
					bCtx.strokeStyle = getToolColor();
					bCtx.beginPath();
					bCtx.moveTo(prevMousePos.x, prevMousePos.y);
					mouse.current.lastX = mouse.current.x;
					mouse.current.lastY = mouse.current.y;
					bCtx.lineTo(mousePos.x, mousePos.y);
					bCtx.lineWidth = data.current.tools.brushSize / scalar * 2;
					bCtx.lineCap = 'round';
					// bCtx.arc(mouse.current.x, mouse.current.y, data.current.tools.brushSize, 0, Math.PI * 2);
					bCtx.stroke();
					saveCanvas();
					// drawRock(bCtx, mouse.current.x / 8, mouse.current.y / 8);
				}
			}
			// drawRock(ctx, 20, 20);
			ctx.drawImage(canvasBuffer, 0, 0, WIDTH, HEIGHT, xOffset, yOffset, WIDTH * scalar, HEIGHT * scalar);

			if (data.current.tools.selectedTool === 'fill') {
				ctx.beginPath();
				let offset = 10;
				ctx.moveTo(mouse.current.x - offset, mouse.current.y - offset);
				ctx.lineTo(mouse.current.x + offset, mouse.current.y + offset);
				ctx.moveTo(mouse.current.x + offset, mouse.current.y - offset);
				ctx.lineTo(mouse.current.x - offset, mouse.current.y + offset);
				ctx.stroke();
			} else {
				ctx.beginPath();
				ctx.arc(mouse.current.x, mouse.current.y, data.current.tools.brushSize, 0, Math.PI * 2);
				ctx.stroke();
			}
			const cursorHidden = mouse.current.x > xOffset && mouse.current.x < xOffset + WIDTH * scalar &&
				mouse.current.y > yOffset && mouse.current.y < yOffset + HEIGHT * scalar;
			canvas.style.cursor = cursorHidden ? 'none' : 'inherit';
			mouse.current.justClicked = false;
			raf = requestAnimationFrame(tick);
		};
		tick();
		canvas.addEventListener('mousemove', mouseMove);
		canvas.addEventListener('mousedown', mouseDown);
		return () => {
			canvas.removeEventListener('mousemove', mouseMove);
			canvas.removeEventListener('mousedown', mouseDown);
			cancelAnimationFrame(raf);
			canvasBuffer.remove();
		}
	}, [canvas, data.current.selectedIndex]);

	const openMenu = (ev: _MouseEvent) => {
		ev.preventDefault();
		context.current.setOpen({
			open: true,
			x: mouse.current.x + canvas!.offsetLeft,
			y: mouse.current.y + canvas!.offsetTop
		});
	}


	const mouseUp = () => {
		mouse.current.down = false;
	};
	const resizeBrush = (ev: WheelEvent<HTMLCanvasElement>) => {
		data.current.tools.brushSize = Math.min(100, Math.max(10, data.current.tools.brushSize + Math.round(ev.deltaY / 20)));
		setData();
	}

	const canvasScalar = getCanvasScalar(width, height).scalar;

	return (
		<>
			<canvas
				width={width} height={height}
				className={classes.canvas} {...bind}
				onMouseUp={mouseUp}
				onMouseOut={mouseUp}
				onContextMenu={openMenu}
				onWheel={resizeBrush}
			/>
			<Paper className={classes.toolbar}>
				<ToggleButtonGroup size="large" exclusive orientation="vertical" value={data.current.tools.selectedTool}
					onChange={(_, selectedTool) => {
						if (selectedTool !== null) {
							data.current.tools.selectedTool = selectedTool;
							setData();
						}
					}}
				>
					<ToggleButton value="pencil">
						<Pencil />
					</ToggleButton>
					<ToggleButton value="eraser">
						<Eraser />
					</ToggleButton>
					<ToggleButton value="fill">
						<FillBucket />
					</ToggleButton>
				</ToggleButtonGroup>
			</Paper>
			<Paper className={classes.scaleIndicator}>
				<Typography>{(tempScale === -1 ? map.feetPerPixel : tempScale).toFixed(2)} {map.feetPerPixel === 1 ? 'foot' : 'feet'} / pixel</Typography>
				<Slider className={classes.slider} color="secondary" value={tempScale === -1 ? map.feetPerPixel : tempScale} min={0.25} max={3.5} step={0.25}
					onChange={(_, value) => {
						value = value as number;
						if (value === 0) return;
						setTempScale(value);
					}}
					onChangeCommitted={(_, value) => {
						setTempScale(-1);
						value = value as number;
						if (value === 0) return;
						map.feetPerPixel = value;
						setData();
					}} />
			</Paper>
			{
				tempScale !== -1 && <div className={classes.thirtyFootIndicator} style={{ width: 30 * canvasScalar / (tempScale) }}>30 feet</div>
			}
			<ContextMenu ref={context} classes={classes} />
		</>
	);

}

const ContextMenu = forwardRef(function ContextMenu({ classes }: { classes: any }, ref) {

	const [data, setData] = useRefState(useContext(UserData));
	const [size, setSize] = useState(data.current.tools.brushSize);
	useEffect(() => {
		setSize(data.current.tools.brushSize);
	}, [data.current.tools.brushSize]);
	const [open, setOpen] = useState({
		open: false,
		x: 0,
		y: 0
	});

	useImperativeHandle(ref, () => ({
		setOpen
	}));
	const onClose = () => setOpen({ x: 0, y: 0, open: false });
	return (
		<Menu
			transitionDuration={{ exit: 0 }}
			keepMounted
			open={open.open}
			onClose={onClose}
			PaperProps={{ className: classes.contextMenu }}
			anchorReference="anchorPosition"
			anchorPosition={{ top: open.y, left: open.x }}
		>
			<ToggleButtonGroup size="large" exclusive value={data.current.tools.brushType} onChange={(_, brushType) => {
				if (brushType === null) return;
				data.current.tools.brushType = brushType;
				setData();
				onClose();
			}}>
				<ToggleButton value="mountain">
					<Mountain htmlColor="#95a5a6" />
				</ToggleButton>
				<ToggleButton value="water">
					<Water htmlColor="#41658A" />
				</ToggleButton>
				<ToggleButton value="grass">
					<Grass htmlColor="#70A37F" />
				</ToggleButton>
				<ToggleButton value="sand">
					<BlurOn htmlColor="#debb83" />
				</ToggleButton>
				<ToggleButton value="dirt">
					<BlurOn htmlColor="#815348" />
				</ToggleButton>
			</ToggleButtonGroup>
			<ListItem>
				<ListItemText primary="Size" />
				<ListItemSecondaryAction>
					{size}
				</ListItemSecondaryAction>
			</ListItem>
			<Slider min={5} color="secondary" value={size} onChange={(_, newValue) => setSize(newValue as number)} onChangeCommitted={(_, brushSize) => {
				data.current.tools.brushSize = brushSize as number;
				setData();
				onClose();
			}} />
		</Menu>
	)
});