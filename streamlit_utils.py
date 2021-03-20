from pathlib import Path
import base64

def load_image(path):
    def img_to_bytes(img_path):
        img_bytes = Path(img_path).read_bytes()
        encoded = base64.b64encode(img_bytes).decode()
        return encoded

    header_html = "<img src='data:image/png;base64,{}' class='img-fluid' style='max-width:100%;'>".format(
        img_to_bytes(path)
    )

    return header_html

def make_clickable(link):
    # target _blank to open new window
    # extract clickable text to display for your link
    return f'<a target="_blank" href="{link}">link</a>'