import re
import warnings

def parseTitle(title):
    content = re.findall("\{(.*?)\}", title, re.I | re.M)[0]
    return "<h1>"+content+"</h1>"



def parseSection(section):
    level = 2
    section = section.replace("\\", "")
    sub = section.split("section")[0]
    level += int(len(sub) / 3)
    content = re.findall("\{(.*?)\}", section, re.I | re.M)[0]

    return "<h" + str(level) + ">" + content + "</h" + str(level) + ">"


# def parseTable():


def latex2html(latex):
    return html


parse_functions = {
    "parseTitle": parseTitle,
    # "parseSection": parseSection,
}


def test(tex: str):
    for f in parse_functions:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                print(f + ':', parse_functions[f](tex))
        except Exception as e:
            print(f, 'failed due to exception', e)
    return


if __name__ == "__main__":
    debug = True
    if debug:
        test("\title{\Huge{PMBANet: Progressive Multi-Branch Aggregation Network for Scene Depth Super-Resolution}}")
    else:
        html = latex2html("\section{PMBANet}")
