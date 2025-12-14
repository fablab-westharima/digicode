import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { UsbEditorPage } from './pages/UsbEditorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UsbEditorPage />} />
        <Route path="/editor" element={<UsbEditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
