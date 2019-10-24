import {IInsightFacade, InsightError} from "./controller/IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";

export default class RoomMemoryManager implements IMemoryManager {
    public helpInitialize(dataset: any, forListDS: any) {
        let i: number = 1;
    }

    // resolves with true if file with the given ID
    public alreadyInDisk(id: string): Promise<boolean> {
        return Promise.reject("not implemented");
    }

    // Writes file to memory and resolves with true if write was successful
    public writeToMemory(id: string): Promise<boolean> {
        return Promise.reject("not implemented");
    }

    // returns either JSObj of successfully parsed file, or null if error was thrown
    public parseFile(text: any): any {
        return null;
    }

    // return the number of valid sections
    public checkValidSections(validSection: any[]): number {
        return -1;
    }

    // Helper for checkValidSections, returns true if the section is valid
    public isSectionValid(section: any): boolean {
        return null;
    }
}
