import './App.css'
import './styles/layout.css'

import Header from './components/layout/Header'
import DashboardIndicadores from './components/dashboard/DashboardIndicadores'
import DashboardGraficos from './components/dashboard/DashboardGraficos'
import DashboardMapaCidades from './components/dashboard/DashboardMapaCidades'
import '@fortawesome/fontawesome-free/css/all.min.css';
import { MapStateProvider } from '@context/MapaContexto';

function App() {
  void Header
  void DashboardIndicadores
  void DashboardGraficos
  void DashboardMapaCidades
  void MapStateProvider
  
  return (
    <MapStateProvider>
      <div className="app-layout">
        <Header />
        <div className="section"><DashboardIndicadores /></div>
        <div className="section"><DashboardMapaCidades /></div>
        <div className="section last-section"><DashboardGraficos /></div>
      </div>
    </MapStateProvider>
  )
}

export default App
