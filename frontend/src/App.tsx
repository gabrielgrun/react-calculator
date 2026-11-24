import { createCalculatorApi } from './api/calculatorClient'
import { Calculator } from './components/Calculator'

const api = createCalculatorApi()

function App() {
  return (
    <main>
      <Calculator api={api} />
    </main>
  )
}

export default App
