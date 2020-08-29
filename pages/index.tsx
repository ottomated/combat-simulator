import React, { createContext, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, ListItemIcon } from '@material-ui/core';
import useLocalStorageState from 'use-local-storage-state';
import { makeStyles } from '@material-ui/core';
import dynamic from 'next/dynamic';

import Question from '@material-ui/icons/HelpOutline';
import ListIcon from '@material-ui/icons/List';
import Brush from '@material-ui/icons/BrushOutlined';
import PersonAdd from '@material-ui/icons/PersonAddOutlined';
import Zoom from '@material-ui/icons/ZoomInOutlined';
import Sword from 'mdi-material-ui/Sword';
import Resize from 'mdi-material-ui/Resize';
import Circle from 'mdi-material-ui/CheckboxBlankCircleOutline';
import Drag from 'mdi-material-ui/DragVariant';

import { v4 as uuid } from 'uuid';
// import CombatField from '../src/components/CombatField';

const Canvas = dynamic(() => import('../src/components/Canvas'), { ssr: false });
const CombatField = dynamic(() => import('../src/components/CombatField'), { ssr: false });
const ToolbarElements = dynamic(() => import('../src/components/MapSelect'), { ssr: false });

const useStyles = makeStyles(() => ({
	'@global': {
		'body': {
			marginTop: 64,
			height: 'calc(100vh - 64px)'
		},
		'html, #__next, #root': {
			height: '100%',
			width: '100%',
			overflow: 'hidden',
			userSelect: 'none'
		}
	},
	helpButton: {
		marginLeft: 'auto'
	}
}));

export interface IDataEntry {
	id: string;
	name: string;
	mapData: string;
	characters: Character[];
	feetPerPixel: number;
}

export interface ToolData {
	selectedTool: 'pencil' | 'eraser' | 'fill';
	brushType: 'mountain' | 'water' | 'grass' | 'sand' | 'dirt';
	brushSize: number;
}

export interface Character {
	x: number;
	y: number;
	imageData: string;
}

export interface IUserData {
	entries: IDataEntry[];
	selectedIndex: number;
	tools: ToolData;
	mode: 'edit' | 'combat';
}
// @ts-ignore
export const UserData = createContext<[IUserData, React.Dispatch<React.SetStateAction<IUserData>>, boolean]>(null);

export default function Index() {
	const classes = useStyles();
	const dataState = useLocalStorageState<IUserData>('ocs.data', {
		entries: [{
			id: uuid(),
			name: "Map 1",
			mapData: "",
			characters: [],
			feetPerPixel: 0.5
		}],
		selectedIndex: 0,
		tools: {
			selectedTool: 'pencil',
			brushType: 'grass',
			brushSize: 10
		},
		mode: 'edit'
	});
	const [data] = dataState;
	const [open, setOpen] = useState(false);

	return (
		<UserData.Provider value={dataState}>
			<div id="root">
				<AppBar>
					<Toolbar>
						<Typography variant="h6">Ottomated Combat Simulator</Typography>
						<ToolbarElements />
						<IconButton className={classes.helpButton} onClick={() => setOpen(true)}>
							<Question />
						</IconButton>
					</Toolbar>
				</AppBar>
				{
					data.mode === 'combat' ?
						<CombatField /> : <Canvas />
				}
				<Dialog open={open} onClose={() => setOpen(false)}>
					<DialogTitle>Tutorial</DialogTitle>
					<DialogContent>
						<List>
							<ListItem><ListItemText primary="Toolbar" /></ListItem>
							<ListItem><ListItemIcon><ListIcon htmlColor='#e74c3c' /></ListItemIcon><ListItemText primary="Choose between your maps in the dropdown." /></ListItem>
							<ListItem><ListItemIcon><Sword htmlColor='#e67e22' /></ListItemIcon><ListItemText primary="Switch between edit and combat mode using the buttons." /></ListItem>
							<ListItem><ListItemText primary="Edit Mode" /></ListItem>
							<ListItem><ListItemIcon><Brush htmlColor='#f1c40f' /></ListItemIcon><ListItemText primary="Select Tools on the right side of the canvas." /></ListItem>
							<ListItem><ListItemIcon><Circle htmlColor='#2ecc71' /></ListItemIcon><ListItemText primary="Right-click to change brush type and size." /></ListItem>
							<ListItem><ListItemIcon><Resize htmlColor='#1abc9c' /></ListItemIcon><ListItemText primary="Adjust the slider in the bottom right to change the scale of the map." /></ListItem>
							<ListItem><ListItemText primary="Combat Mode" /></ListItem>
							<ListItem><ListItemIcon><PersonAdd htmlColor='#3498db' /></ListItemIcon><ListItemText primary="Click the button in the top right to draw a new creature (left-click to draw, right-click to erase) and place it in the center of the map." /></ListItem>
							<ListItem><ListItemIcon><Zoom htmlColor='#9b59b6' /></ListItemIcon><ListItemText primary="Click and drag to pan the map, and scroll to zoom it." /></ListItem>
							<ListItem><ListItemIcon><Drag htmlColor='#f73378' /></ListItemIcon><ListItemText primary="Drag creatures to move them on the map." /></ListItem>
						</List>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setOpen(false)}>
							Close
						</Button>
					</DialogActions>
				</Dialog>
			</div>
		</UserData.Provider>
	);
}
