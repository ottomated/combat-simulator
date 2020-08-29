import {
	Select, MenuItem, Button,
	Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from "@material-ui/core";
import { makeStyles } from '@material-ui/core';
import { useContext, useState } from "react";
import { UserData } from "../../pages";
import AddOutlined from '@material-ui/icons/AddOutlined';
import { v4 as uuid } from 'uuid';
import { useRefState } from "../hooks";
import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";

const useStyles = makeStyles((theme) => ({
	comboBox: {
		width: 300,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(2),
	},
}));
const useSwitcherStyles = makeStyles((theme) => ({
	switcher: {
		marginLeft: theme.spacing(2),
	},
}));

function MapSelect() {
	const classes = useStyles();
	const [data, setData] = useRefState(useContext(UserData));

	const selectedEntry = data.current.entries[data.current.selectedIndex];
	return (
		<Select
			// disabled={data.entries.length === 0}
			margin="dense"
			variant="outlined"
			color="secondary"
			className={classes.comboBox}
			value={selectedEntry ? data.current.selectedIndex : ''}
			onChange={(ev) => {
				data.current.selectedIndex = ev.target.value as number;
				setData();
			}}
		>
			{data.current.entries.map((entry, i) => <MenuItem key={i} value={i}>{entry.name}</MenuItem>)}
		</Select>
	);
}

function NewMapButton() {
	const [data, setData] = useRefState(useContext(UserData));

	const [open, setOpen] = useState(false);
	const [newName, setNewName] = useState('');

	const closeDialog = () => setOpen(false);
	const openDialog = () => {
		setOpen(true);
		setNewName('');
	}
	const createNewMap = () => {
		closeDialog();
		data.current.selectedIndex = data.current.entries.length;
		data.current.entries.push({
			id: uuid(),
			name: newName,
			mapData: '',
			characters: [],
			feetPerPixel: 0.5
		});
		setData();
	};
	return (
		<>
			<Dialog open={open} onClose={closeDialog}>
				<DialogTitle>New Map</DialogTitle>
				<DialogContent>
					<TextField autoFocus variant="outlined" color="secondary" label="Map Name" value={newName} onChange={(ev) => setNewName(ev.currentTarget.value)} 
						onKeyDown={(ev) => {
							if (ev.key === 'Enter') {
								ev.preventDefault();
								createNewMap();
							}
						}}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeDialog}>Cancel</Button>
					<Button onClick={createNewMap} color="secondary">Create</Button>
				</DialogActions>
			</Dialog>
			<Button variant="contained" color="secondary" onClick={openDialog}>
				<AddOutlined />New Map
		</Button>
		</>
	);
}

function ModeSwitcher() {
	const classes = useSwitcherStyles();
	const [data, setData] = useRefState(useContext(UserData));
	return (
		<ToggleButtonGroup className={classes.switcher} exclusive value={data.current.mode} onChange={(_, value) => {
			if (value === null) return;
			data.current.mode = value;
			setData();
		}}>
			<ToggleButton value="edit">
				Edit Mode
			</ToggleButton>
			<ToggleButton value="combat">
				Combat Mode
			</ToggleButton>
		</ToggleButtonGroup>
	)
}

export default function ToolbarElements() {
	return (
		<>
			<MapSelect />
			<NewMapButton />
			<ModeSwitcher />
		</>
	);
}