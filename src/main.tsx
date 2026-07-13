import { render } from 'preact'
import './pdf/pdfjsSetup'
import './styles/global.css'
import { App } from './App'

render(<App />, document.getElementById('app')!)
