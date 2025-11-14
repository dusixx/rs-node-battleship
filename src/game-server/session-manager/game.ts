import { getId } from '../../common/utils';

export class Game {
  constructor(private id = getId()) {}

  public get gameId(): string {
    return this.id;
  }
}
