// O site é estático: quem deixa a aba aberta (ou o index.html em cache) continua com o JS de
// antes do último deploy. Se o index.html publicado já aponta pra outro bundle, recarrega a
// página inteira; senão só refaz a busca de dados, sem perder rascunhos não salvos.
export async function atualizarOuRecarregar(recarregarDados: () => unknown) {
  try {
    const bundle = document
      .querySelector('script[type="module"][src*="/assets/"]')
      ?.getAttribute("src");
    const html = await (await fetch("/", { cache: "reload" })).text();
    if (bundle && !html.includes(bundle)) {
      location.reload();
      return;
    }
  } catch {
    // offline ou fetch barrado: cai no refresh de dados
  }
  recarregarDados();
}
