import { Generator } from '@bomijs/utils';
import { join } from 'path';

class projectGenerator extends Generator {
  async writing() {
    this.copyDirectory({
      path: join(__dirname, "../templete"),
      target: this.cwd,
      context: {
        version: require("@assits/bro-build/package.json").version,
      },
    });
  }
}

export default async function ({ cwd, args }) {
  const generator = new projectGenerator({ cwd, args });
  await generator.run();
}
