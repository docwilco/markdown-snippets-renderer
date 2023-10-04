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

let suspendEvents = false;

// Setup listener for messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
        case 'showHtml':
            const renderedSnippet = document.getElementById('renderedSnippet');
            if (!renderedSnippet) {
                console.error('Could not find renderedSnippet element');
                return;
            }
            renderedSnippet.innerHTML = message.html;
            break;
        case 'updateConfig':
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
            sameCheckbox.checked = message.same;
            startField.value = message.startDelimiter;
            endField.value = message.endDelimiter;
            if (message.same) {
                endField.disabled = true;
            }
            suspendEvents = false;
            break;
        default:
            console.error('Unknown message received from extension');
    }
});

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

function main() {
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
}
