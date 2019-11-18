import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {
    private scheduledSections: any = {};
    private scheduledRooms: any = {};
    // private distance: any = {};
    private ts: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200", "MWF 1200-1300",
        "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930", "TR  0930-1100",
        "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];

    // private max: number;
    private totalEnrollment: number;

    constructor() {
        //
    }

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let rt: any = {};
        // this.getDistance(rooms);
        this.totalEnrollment = sections.reduce( (acc, curr) =>
            acc + curr.courses_pass + curr.courses_fail + curr.courses_audit, 0);
        let final: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        this.prepare(sections, rooms, final);
        if (sections.length > 0) {
            for (let section of sections) {
                if (!this.scheduledSections.hasOwnProperty(section.courses_dept)) {
                    this.scheduledSections[section.courses_dept] = {};
                }
                if (!this.scheduledSections[section.courses_dept].hasOwnProperty(section.courses_id)) {
                    this.scheduledSections[section.courses_dept][section.courses_id] = [];
                }
                this.addHelper(section, rooms, rt);
            }
            for (let key of Object.keys(rt)) {
                final.push(rt[key]);
            }
        }
        // let currEnroll: number = 0;
        // let maxDist: number = 0;
        // for (let entry of final) {
        //     currEnroll += Number(entry[1].courses_audit + entry[1].courses_pass + entry[1].courses_fail);
        // }
        // Log.trace("E = " + (currEnroll / this.totalEnrollment));
        return final;
    }

    private calcDist(room1: SchedRoom, room2: SchedRoom): number {
        let R = 6371e3;
        let lat1 = room1.rooms_lat;
        let lat2 = room2.rooms_lat;
        let lon1 = room1.rooms_lon;
        let lon2 = room2.rooms_lon;
        let dLat = this.deg2rad(lat1 - lat2);
        let dLon = this.deg2rad(lon1 - lon2);

        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private addHelper(section: SchedSection, rooms: SchedRoom[], rt: any) {
        let cap: number = Number(section.courses_fail + section.courses_pass + section.courses_audit);
        let sec: TimeSlot[] = this.scheduledSections[section.courses_dept][section.courses_id];
        for (let room of rooms) {
            if (!this.scheduledRooms.hasOwnProperty(room.rooms_name)) {
                this.scheduledRooms[room.rooms_name] = [];
            }
            if (room.rooms_seats < cap) {
                continue;
            }
            let timeRoom: TimeSlot[] = this.scheduledRooms[room.rooms_name];
            if (timeRoom.length >= 15) {
                continue;
            }
            for (let time of this.ts) {
                if (!sec.includes(time) && !timeRoom.includes(time)) {
                    this.scheduledRooms[room.rooms_name].push(time);
                    this.scheduledSections[section.courses_dept][section.courses_id].push(time);
                    rt[section.courses_uuid] = [room, section, time];
                    return;
                }
            }
        }
    }

    // private addCheck(section: SchedSection, room: SchedRoom, dist: number): any[] {
    //     let nearby: string[] = Object.keys(this.scheduledRooms);
    //     let min: number = dist;
    //     if (nearby.length < 1) {
    //         return [true, 0];
    //     }
    //     for (let near of nearby) {
    //         if (near === room.rooms_name) {
    //             return [true, 0];
    //         }
    //         if (min >= this.distance[near][room.rooms_name]) {
    //             min = this.distance[near][room.rooms_name];
    //         }
    //     }
    //     let rt: boolean = min <= dist;
    //     return [rt, min];
    // }

    // private getDistance(rooms: SchedRoom[]) {
    //     for (let i = 0; i < rooms.length; i++) {
    //         for (let j = i + 1; j < rooms.length; j++) {
    //             if (!this.distance.hasOwnProperty(rooms[i].rooms_name)) {
    //                 this.distance[rooms[i].rooms_name] = {};
    //             }
    //             if (!this.distance.hasOwnProperty(rooms[j].rooms_name)) {
    //                 this.distance[rooms[j].rooms_name] = {};
    //             }
    //             let dist: number = this.calcDist(rooms[i], rooms[j]);
    //             if (dist > this.max) {
    //                 this.max = dist;
    //             }
    //             this.distance[rooms[i].rooms_name][rooms[j].rooms_name] = dist;
    //             this.distance[rooms[j].rooms_name][rooms[i].rooms_name] = dist;
    //         }
    //     }
    // }

    private sortRooms(rooms: SchedRoom[]) {
        let that = this;
        let first: SchedRoom = rooms[0];
        rooms.sort(function (a: SchedRoom, b: SchedRoom) {
            // if (that.distance[first.rooms_name][a.rooms_name] < that.distance[first.rooms_name][b.rooms_name]) {
            if (that.calcDist(first, a) < that.calcDist(first, b)) {
                return 1;
            }
            // if (that.distance[first.rooms_name][a.rooms_name] > that.distance[first.rooms_name][b.rooms_name]) {
            if (that.calcDist(first, a) > that.calcDist(first, b)) {
                return -1;
            }
            return 0;
        });
    }

    private prepare(sections: SchedSection[], rooms: SchedRoom[], final: Array<[SchedRoom, SchedSection, TimeSlot]>) {
        rooms.sort(function (a, b) {
            return (a.rooms_seats < b.rooms_seats) ? 1 : (b.rooms_seats < a.rooms_seats) ? -1 : 0;
        });
        sections.sort(function (a, b) {
            let aCap: number = (a.courses_pass + a.courses_fail + a.courses_audit);
            let bCap: number = (b.courses_pass + b.courses_fail + b.courses_audit);
            return (aCap < bCap) ? 1 : (bCap < aCap) ? -1 : 0;
        });
        let first: boolean = true;
        while (first) {
            if (sections.length > 0) {
                let fSec: SchedSection = sections.shift();
                let cap: number = fSec.courses_pass + fSec.courses_fail + fSec.courses_audit;
                if (cap <= rooms[0].rooms_seats) {
                    final.push([rooms[0], fSec, this.ts[0]]);
                    this.scheduledRooms[rooms[0].rooms_name] = [];
                    this.scheduledRooms[rooms[0].rooms_name].push(this.ts[0]);
                    this.scheduledSections[fSec.courses_dept] = {};
                    this.scheduledSections[fSec.courses_dept][fSec.courses_id] = [];
                    this.scheduledSections[fSec.courses_dept][fSec.courses_id].push(this.ts[0]);
                    first = false;
                    this.sortRooms(rooms);
                }
            } else {
                first = false;
            }
        }
    }
}

