import { createMuiTheme } from '@material-ui/core/styles';
import { orange } from '@material-ui/core/colors';

// Create a theme instance.
const theme = createMuiTheme({
	palette: {
		type: 'dark',
		primary: {
			main: '#000000',
		},
		secondary: orange
	},
});

export default theme;
