export default function PularConteudo() {
  return <a className="pular" href="#conteudo" onClick={evento => {
    const conteudo = evento.currentTarget.ownerDocument.getElementById('conteudo')
    if (conteudo) {
      evento.preventDefault()
      conteudo.focus()
    }
  }}>Ir para o conteúdo</a>
}
