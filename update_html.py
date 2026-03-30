import re

def process_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Function to replace the button, and extract the price to pass to the function
    def replacer(match):
        h3 = match.group(1)
        price_str = match.group(2)
        price = price_str.replace('$', '').replace('.', '')
        # replace the original <a> with the new <button>
        # match.group(0) is the whole match
        return f'<h3>{h3}</h3>\n    <p class="precio">{price_str}</p>{match.group(3)}<button class="btn-wpp btn-add" onclick="agregarAlCarrito(\'{h3}\', {price}, this)">Agregar al carrito</button>'

    new_html = re.sub(
        r'<h3>(.*?)</h3>\s*<p class="precio">(.*?)</p>(.*?)<a class="btn-wpp" href="[^"]*">Consultar por WhatsApp</a>',
        replacer,
        html,
        flags=re.DOTALL
    )

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)

process_html()
