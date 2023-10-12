import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeDivider,
    vsCodeTextField,
    Checkbox,
    TextField,
} from '@vscode/webview-ui-toolkit';

const vscode = acquireVsCodeApi();

provideVSCodeDesignSystem().register(
    vsCodeCheckbox(),
    vsCodeDivider(),
    vsCodeTextField(),
);

window.addEventListener('load', main);

type State = {
    startDelimiter: string;
    endDelimiter: string;
    same: boolean;
    html: string;
};

let suspendEvents = false;

const previousState = vscode.getState() as State;
let state = previousState ?? {
    startDelimiter: '',
    endDelimiter: '',
    same: false,
    html: '',
};
showHtml(state.html);
updateConfig(state.same, state.startDelimiter, state.endDelimiter);

// Setup listener for messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
        case 'showHtml':
            showHtml(message.html);
            break;
        case 'updateConfig':
            updateConfig(message.startDelimiter, message.endDelimiter, message.same);
            break;
        case 'updateTheme':
            updateTheme(message.theme);
            break;
        default:
            console.error('Unknown message received from extension');
    }
});

function main() {
    const same = document.getElementById('same');
    const startDelimiter = document.getElementById('startDelimiter');
    const endDelimiter = document.getElementById('endDelimiter');
    const settings = document.getElementById('settings');
    if (!same || !startDelimiter || !endDelimiter || !settings) {
        console.error('Could not find elements');
        return;
    }
    const sameCheckbox = same as Checkbox;
    const startField = startDelimiter as TextField;
    const endField = endDelimiter as TextField;
    sameCheckbox.addEventListener('change', () => {
        if (suspendEvents) {
            return;
        }
        if (sameCheckbox.checked) {
            endField.value = startField.value;
            endField.disabled = true;
        } else {
            endField.disabled = false;
        }
        updateExtension(
            startField.value,
            endField.value,
            sameCheckbox.checked
        );
    });
    startField.addEventListener('input', () => {
        if (suspendEvents) {
            return;
        }
        if (sameCheckbox.checked) {
            endField.value = startField.value;
        }
        updateExtension(
            startField.value,
            endField.value,
            sameCheckbox.checked
        );
    });
    endField.addEventListener('input', () => {
        if (suspendEvents) {
            return;
        }
        updateExtension(
            startField.value,
            endField.value,
            sameCheckbox.checked
        );
    });
    settings.addEventListener('click', settingsClicked);
}

function showHtml(html: string) {
    const renderedSnippet = document.getElementById('renderedSnippet');
    if (!renderedSnippet) {
        console.error('Could not find renderedSnippet element');
        return;
    }
    renderedSnippet.innerHTML = html;
    state.html = html;
    Array.from(document.getElementsByTagName('pre')).forEach(element => {
        element.className = 'hljs';        
    });
    vscode.setState(state);
}

function updateConfig(newSame: boolean, newStartDelimiter: string, newEndDelimiter: string) {
    const same = document.getElementById('same');
    const startDelimiter = document.getElementById('startDelimiter');
    const endDelimiter = document.getElementById('endDelimiter');
    if (!same || !startDelimiter || !endDelimiter) {
        console.error('Could not find elements');
        return;
    }

    const sameCheckbox = same as Checkbox;
    const startField = startDelimiter as TextField;
    const endField = endDelimiter as TextField;
    suspendEvents = true;
    sameCheckbox.checked = newSame;
    startField.value = newStartDelimiter;
    if (newSame) {
        endField.disabled = true;
        endField.value = startField.value;
    } else {
        endField.value = newEndDelimiter;
    }
    suspendEvents = false;
    state.same = newSame;
    state.startDelimiter = newStartDelimiter;
    state.endDelimiter = newEndDelimiter;
    vscode.setState(state);
}

function updateExtension(
    startDelimiter: string,
    endDelimiter: string,
    same: boolean,
) {
    vscode.postMessage({
        command: 'updateDelimiters',
        startDelimiter,
        endDelimiter,
        same,
    });
}

function updateTheme(theme: string) {
    const stylesheetLink = document.getElementById('stylesheetLink')! as HTMLLinkElement;
    let href = stylesheetLink.href;
    href = href.replace(/\/[^/]*\.min.css/, `/${theme}.min.css`);
    stylesheetLink.href = href;
}

function settingsClicked(): boolean {
    vscode.postMessage({
        command: 'settingsClicked',
    });
    return false;
}
